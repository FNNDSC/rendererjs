/**
 * This module implements a renderer window
 */

// define a new module
define(['utiljs', 'jszip', 'jquery_ui', 'xtk', 'dicomParser'], function(util, jszip) {

  /**
   * Provide a namespace for the renderer module
   *
   * @namespace
   */
   var rendererjs = rendererjs || {};

   /**
    * Class implementing the renderer window
    *
    * @constructor
    * @param {Object} renderer options object with properties:
    *  -container: renderer's container's DOM id or renderer's container's DOM object
    *  -rendererId: a DOM id for the XTK renderer object
    *  -orientation: renderer's orientation, either of the strings: 'X', 'Y' or 'Z'
    * @param {Object} optional file manager object to enable reading of files from the cloud or HTML5
    * sandboxed filesystem.
    */
    rendererjs.Renderer = function(options, fileManager) {

      this.version = 0.0;

      // renderer's container
      if (typeof options.container === 'string') {

        // a DOM id was passed
        this.container = $('#' + options.container);

      } else {

        // a DOM object was passed
        this.container = $(options.container);
      }

      // XTK renderer's container id
      this.rendererId = options.rendererId;

      // renderer's orientation
      this.orientation = 'Z';
      if (options.orientation) {this.orientation = options.orientation;}

      // xtk renderer object
      this.renderer = null;

      // xtk volume object
      this.volume = null;

      // whether the renderer's window is maximized
      this.maximized = false;

      // file manager object
      this.fileManager = null;
      if (fileManager) {this.fileManager = fileManager;}

      // associated image file object
      this.imgFileObj = null;
    };

    /**
     * Initialize the renderer.
     *
     * @param {Object} image file object with the following properties:
     *  -baseUrl: String ‘directory/containing/the/files’.
     *  -imgType: String neuroimage type. Any of the possible values returned by rendererjs.Renderer.imgType
     *  -files: Array of HTML5 File objects or custom file objects with properties:
     *     -remote: a boolean indicating whether the file has not been read locally (with a filepicker)
     *     -url the file's url
     *     -cloudId: the id of the file in a cloud storage system if stored in the cloud
     *     -name: file name
     *  The files array contains a single file for imgType different from 'dicom' or 'dicomzip'
     *  -json: HTML5 or custom File object (optional json file with the mri info for imgType different from 'dicom')
     * @param {Function} optional callback to be called when the renderer is ready.
     */
     rendererjs.Renderer.prototype.init = function(imgFileObj, callback) {
       var self = this;

       self.imgFileObj = imgFileObj;
       self.createUI();
       self.createRenderer();
       self.createVolume();

       self.readVolumeFiles( function() {

         self.renderVolume( function() {

           // renderer ready
           if (callback) { callback(); }
         });
       });
    };

    /**
     * Create and initialize the renderer's HTML UI.
     */
     rendererjs.Renderer.prototype.createUI = function() {
       var url = this.imgFileObj.baseUrl + this.imgFileObj.files[0].name;
       var self = this;

       // add the appropriate classes to the renderer container
       this.container.addClass("view-renderer");

       // append html interface to the renderer's container
       this.container.append(

         // title bar
         '<div class="view-renderer-titlebar ui-dialog-titlebar ui-widget-header ui-corner-all">' +
           '<span class="view-renderer-titlebar-title">' + url + '</span>' +
           '<div class="view-renderer-titlebar-buttonpane">' +
             '<button type="button" class="view-renderer-titlebar-buttonpane-close ui-dialog-titlebar-close" role="button" title="Close">' +
               '<span class="ui-icon-closethick"></span>' +
             '</button>' +
             '<button type="button" class="view-renderer-titlebar-buttonpane-maximize ui-dialog-titlebar-maximize" role="button" title="Maximize">' +
               '<span class="ui-icon-extlink"></span>' +
             '</button>' +
           '</div>' +
         '</div>' +

         // content space
         '<div id="' + self.rendererId + '" class="view-renderer-content">' +
           '<div class="view-renderer-info view-renderer-info-topleft"></div>' +
           '<div class="view-renderer-info view-renderer-info-topright"></div>' +
           '<div class="view-renderer-info view-renderer-info-bottomright"></div>' +
           '<div class="view-renderer-info view-renderer-info-bottomleft"></div>' +
         '</div>'
      );

      // add the appropriate classes to the title bar elements

      var jqButtons = $('button', self.container);

      jqButtons.addClass("ui-button ui-widget ui-state-default ui-corner-all");
      $('span', jqButtons).addClass("ui-button-icon-primary ui-icon");

      jqButtons.mouseover(function() {
        return $(this).addClass("ui-state-hover");
      }).mouseout(function() {
        return $(this).removeClass("ui-state-hover");
      }).focus(function() {
        return $(this).addClass("ui-state-focus");
      }).blur(function() {
        return $(this).removeClass("ui-state-focus");
      });

      // buttons' event handlers
      jqButtons.click( function(evt) {
        var jqBtn = $(this);

        if (jqBtn.hasClass('view-renderer-titlebar-buttonpane-close')) {

          self.destroy();

        } else if (jqBtn.hasClass('view-renderer-titlebar-buttonpane-maximize')) {

          if (self.maximized) {
            self.restore();
          } else {
            self.maximize();
          }

          self.onRendererChange(evt);
        }
      });
     };

     /**
      * Maximize the renderer's window
      */
      rendererjs.Renderer.prototype.maximize = function() {
        var jqBtn = $('.view-renderer-titlebar-buttonpane-maximize', this.container);

        jqBtn.attr('title', 'Restore');

        // toggle classes from maximize to restore
        jqBtn.removeClass("ui-dialog-titlebar-maximize").addClass("ui-dialog-titlebar-restore");
        jqBtn.find('span').removeClass("ui-icon-extlink").addClass("ui-icon-newwin");

        // save the current renderer's dimensions
        this.height = this.container.css('height');
        this.width = this.container.css('width');

        // style renderer
        this.container.css({display: 'block', height: '100%', width: '100%'});

        util.documentRepaint();
        this.maximized = true;
     };

     /**
      * Restore the renderer's window to its original size
      */
      rendererjs.Renderer.prototype.restore = function() {
        var jqBtn = $('.view-renderer-titlebar-buttonpane-maximize', this.container);

        jqBtn.attr('title', 'Maximize');

        // toggle classes from restore to maximize
        jqBtn.removeClass("ui-dialog-titlebar-restore").addClass("ui-dialog-titlebar-maximize");
        jqBtn.find('span').removeClass("ui-icon-newwin").addClass("ui-icon-extlink");

        // style renderer
        this.container.css({display: 'block', height: this.height, width: this.width});

        util.documentRepaint();
        this.maximized = false;
     };

     /**
      * Create an XTK 2D renderer object and set the renderer property to that object.
      */
      rendererjs.Renderer.prototype.createRenderer = function() {
       var r;
       var self = this;

       if (self.renderer) { return; }

       // create xtk object
       r = new X.renderer2D();
       r.container = self.rendererId;
       r.bgColor = [0.2, 0.2, 0.2];
       r.orientation = self.orientation;
       r.init();

       //
       // XTK renderer's UI event handlers
       //
       this.onRenderer2DScroll = function(evt) {
         self.updateUISliceInfo();
         self.onRendererChange(evt);
       };

       this.onRenderer2DZoom = function(evt) {
         self.onRendererChange(evt);
       };

       this.onRenderer2DPan = function(evt) {
         self.onRendererChange(evt);
       };

       this.onRenderer2DRotate = function(evt) {
         self.onRendererChange(evt);
       };

       this.onRenderer2DFlipColumns = function(evt) {
         // press W to trigger this event
         r.flipColumns = !r.flipColumns;
         self.onRendererChange(evt);
       };

       this.onRenderer2DFlipRows = function(evt) {
         // press Q to trigger this event
         r.flipRows = !r.flipRows;
         self.onRendererChange(evt);
       };

       this.onRenderer2DPoint = function(evt) {
         self.onRendererChange(evt);
       };

       // bind event handler callbacks with the renderer's interactor
       r.interactor.addEventListener(X.event.events.SCROLL, this.onRenderer2DScroll);
       r.interactor.addEventListener(X.event.events.ZOOM, this.onRenderer2DZoom);
       r.interactor.addEventListener(X.event.events.PAN, this.onRenderer2DPan);
       r.interactor.addEventListener(X.event.events.ROTATE, this.onRenderer2DRotate);
       r.interactor.addEventListener("flipColumns", this.onRenderer2DFlipColumns);
       r.interactor.addEventListener("flipRows", this.onRenderer2DFlipRows);

       // called every time the pointing position is changed with shift+left-mouse
       r.addEventListener("onPoint", this.onRenderer2DPoint);

       self.renderer = r;
     };

    /**
     * Create an XTK volume object and set the volume property to that object.
     */
     rendererjs.Renderer.prototype.createVolume = function() {
      var fileNames = [];
      var imgFileObj = this.imgFileObj;

      // return if volume already created
      if (this.volume) {return;}

      if (imgFileObj.imgType === 'dicomzip') {
        for (var i=0; i<imgFileObj.files.length; i++) {
          fileNames[i] = imgFileObj.files[i].name.replace('.zip', '');
        }
      } else {
        for (var j=0; j<imgFileObj.files.length; j++) {
          fileNames[j] = imgFileObj.files[j].name;
        }
      }
      // create xtk object
      var vol = new X.volume();
      vol.reslicing = 'false';
      vol.file = fileNames.sort().map(function(str) {
        return imgFileObj.baseUrl + str;});

      this.volume = vol;
    };

    /**
     * Get XTK volume properties for the passed orientation.
     *
     * @param {String} X, Y or Z orientation.
     * @return {Object} the volume properties.
     */
     rendererjs.Renderer.prototype.getVolProps = function(orientation) {
       var volProps = {};

       // define XTK volume properties for the passed orientation
       volProps.index = 'index' + orientation;

       switch(orientation) {
         case 'X':
           volProps.rangeInd = 0;
         break;
         case 'Y':
           volProps.rangeInd = 1;
         break;
         case 'Z':
           volProps.rangeInd = 2;
         break;
       }

       return volProps;
    };

    /**
     * Perform the actual rendering of the volume data.
     *
     * @param {Function} optional callback to be called when the XTK renderer object is ready.
     */
     rendererjs.Renderer.prototype.renderVolume = function(callback) {
      var r = this.renderer;
      var vol = this.volume;
      var self = this;

      // the onShowtime event handler gets executed after all files were fully loaded and
      // just before the first rendering attempt
      r.onShowtime = function() {

        self.setUIMriInfo( function() {

          // renderer is ready
          if (callback) { callback(); }
        });
      };

      r.add(vol);

      // start the rendering
      r.render();

      util.documentRepaint();
    };

    /**
     * Update slice info on the HTML.
     */
     rendererjs.Renderer.prototype.updateUISliceInfo = function() {
       var volProps = this.getVolProps(this.orientation);
       var vol = this.volume;

       $('.view-renderer-info-bottomleft', this.container).html(
         'slice: ' + (vol[volProps.index] + 1) + '/' + vol.range[volProps.rangeInd]);
     };

    /**
     * Set the MRI information on the UI HTML .
     *
     * @param {Function} optional callback to be called when the UI is ready.
     */
     rendererjs.Renderer.prototype.setUIMriInfo = function(callback) {
       var self = this;
       var imgFileObj = self.imgFileObj;
       var vol = self.volume;

       function setHTMLInfo(info) {
         var jqR = self.container;
         var age = '', orient = '', direct = '';

         if (info.patientAge) {
           age =  'AGE: ' + info.patientAge + '<br>';
         }

         $('.view-renderer-info-topleft', jqR).html(
           info.patientName + '<br>' +
           info.patientId + '<br>' +
           'BIRTHDATE: ' + info.patientBirthDate + '<br>' +
           age +
           'SEX: ' + info.patientSex );

         $('.view-renderer-info-topright', jqR).html(
           'SERIES: ' + info.seriesDescription + '<br>' +
           info.manufacturer + '<br>' +
           info.studyDate + '<br>' +
           info.dimensions + '<br>' +
           info.voxelSizes );

         if (info.orientation) {
             orient = info.orientation + '<br>';
         }

         if (info.primarySliceDirection) {
           direct = info.primarySliceDirection;
         }

         $('.view-renderer-info-bottomright', jqR).html(
           orient + direct );

         self.updateUISliceInfo();

         // UI is ready
         if (callback) { callback(); }
       }

       if (imgFileObj.json) {

         // if there is a json file then read it
         self.readJSONFile(imgFileObj.json, function(jsonObj) {
           var mriInfo = {
             patientName: jsonObj.PatientName,
             patientId: jsonObj.PatientID,
             patientBirthDate: jsonObj.PatientBirthDate,
             patientSex: jsonObj.PatientSex,
             seriesDescription: jsonObj.SeriesDescription,
             manufacturer: jsonObj.Manufacturer,
             studyDate: jsonObj.StudyDate,
             orientation: jsonObj.mri_info.orientation,
             primarySliceDirection: jsonObj.mri_info.primarySliceDirection,
             dimensions: jsonObj.mri_info.dimensions,
             voxelSizes: jsonObj.mri_info.voxelSizes
           };

           setHTMLInfo(mriInfo);
         });

       } else if (imgFileObj.dicomInfo) {

         // if instead there is dicom information then use it
         var mriInfo = imgFileObj.dicomInfo;
         mriInfo.dimensions = (vol.range[0]) + ' x ' + (vol.range[1]) + ' x ' + (vol.range[2]);
         mriInfo.voxelSizes = vol.spacing[0].toPrecision(4) + ', ' + vol.spacing[1].toPrecision(4) +
         ', ' + vol.spacing[2].toPrecision(4);

         setHTMLInfo(mriInfo);

       } else {

         // just display slice number
         self.updateUISliceInfo();

         // UI is ready
         if (callback) { callback(); }
       }
     };

    /**
     * This method is called when any of the contained renderers changes status.
     *
     * @param {Object} event object.
     */
     rendererjs.Renderer.prototype.onRendererChange = function(evt) {

       console.log('onRendererChange not overwritten!');
       console.log('event obj: ', evt);
     };

     /**
      * Destroy all objects and remove html interface
      */
      rendererjs.Renderer.prototype.destroy = function() {
        var r = this.renderer;

       // destroy XTK renderers
       r.remove(this.volume);
       this.volume.destroy();
       r.interactor.removeEventListener(X.event.events.SCROLL, this.onRenderer2DScroll);
       r.interactor.removeEventListener(X.event.events.ZOOM, this.onRenderer2DZoom);
       r.interactor.removeEventListener(X.event.events.PAN, this.onRenderer2DPan);
       r.interactor.removeEventListener(X.event.events.ROTATE, this.onRenderer2DRotate);
       r.interactor.removeEventListener("flipColumns", this.onRenderer2DFlipColumns);
       r.interactor.removeEventListener("flipRows", this.onRenderer2DFlipRows);
       r.removeEventListener("onPoint", this.onRenderer2DPoint);
       r.destroy();

       // remove html
       this.container.empty();

       // clear objects
       this.renderer = null;
       this.volume = null;
       this.maximized = false;
     };

     /**
      * Read the local or remote volume files.
      *
      * @param {Function} callback to be called when all volume files have been read.
      */
      rendererjs.Renderer.prototype.readVolumeFiles = function(callback) {
        var imgFileObj = this.imgFileObj;
        var vol = this.volume;
        var numFiles = 0;
        var filedata = [];
        var self = this;

        // function to read a single volume file
        function readFile(file, ix) {

          self.readFile(file, 'readAsArrayBuffer', function(data) {
            filedata[ix] = data;
            ++numFiles;

            if (numFiles===imgFileObj.files.length) {

              if (imgFileObj.imgType === 'dicom' || imgFileObj.imgType === 'dicomzip') {

                // if the files are zip files of dicoms then unzip them and sort the resultant files
                if (imgFileObj.imgType === 'dicomzip') {
                  var fDataArr = [];

                  for (var i=0; i<filedata.length; i++) {
                    fDataArr = fDataArr.concat(self.unzipFileData(filedata[i]));
                  }
                  fDataArr = util.sortObjArr(fDataArr, 'name');

                  filedata = [];
                  var urls = [];
                  for (i=0; i<fDataArr.length; i++) {
                    filedata.push(fDataArr[i].data);
                    urls.push(imgFileObj.baseUrl + fDataArr[i].name);
                  }
                  vol.file = urls;
                }

                try {
                  imgFileObj.dicomInfo = rendererjs.Renderer.parseDicom(filedata[0]);
                } catch(err) {
                  console.log('Could not parse dicom ' + imgFileObj.baseUrl + ' Error - ' + err);
                }
              }

              vol.filedata = filedata;
              callback();
            }
          });
        }

        // read all neuroimage files in imgFileObj.files
        for (var i=0; i<imgFileObj.files.length; i++) {
          readFile(imgFileObj.files[i], i);
        }
      };

    /**
     * Read a local or remote JSON file.
     *
     * @param {Object} HTML5 file object or an object containing properties:
     *  -remote: a boolean indicating whether the file has not been read locally (with a filepicker)
     *  -url the file's url
     *  -clouId: the id of the file in a cloud storage system if stored in the cloud
     * @param {Function} callback whose argument is a JSON object with the file data.
     */
     rendererjs.Renderer.prototype.readJSONFile = function(file, callback) {
       this.readFile(file, 'readAsText', function(data) {
         callback(JSON.parse(data));
       });
     };

    /**
     * Read a local or remote file.
     *
     * @param {Object} HTML5 file object or an object containing properties:
     *  -remote: a boolean indicating whether the file has not been read locally (with a filepicker)
     *  -url the file's url
     *  -clouId: the id of the file in a cloud storage system if stored in the cloud
     * @param {String} reading method.
     * @param {Function} callback whose argument is the file data.
     */
     rendererjs.Renderer.prototype.readFile = function(file, readingMethod, callback) {
      var reader = new FileReader();
      var self = this;

      reader.onload = function() {
        callback(reader.result);
      };

      if (file.remote) {
        // the file is in a remote storage
        if (file.cloudId) {
          // the file is in the cloud
          if (self.fileManager) {
            // reading files from the cloud was enabled
            self.fileManager.getFileBlob(file.cloudId, function(blob) {
              reader[readingMethod](blob);
            });
          } else {
            console.error('No file manager found. Reading files from cloud was not enabled');
          }
        } else {
          // the file is in a remote backend
          util.urlToBlob(file.url, function(blob) {
            reader[readingMethod](blob);
          });
        }
      } else {
        // read the file locally
        reader[readingMethod](file);
      }
    };

    /**
     * Zip the contents of several files into a few zip file contents. Maximum size for
     * each resultant zip file contents is 20 MB.
     *
     * @param {Array} Array of HTML5 file objects or objects containing properties:
     *  -remote: a boolean indicating whether the file has not been read locally (with a filepicker)
     *  -url the file's url
     *  -cloudId: the id of the file in a cloud storage system if stored in the cloud
     * @param {Function} callback whose argument is an array of arrayBuffer. Each entry of the
     * array contains the data for a single zip file.
     */
     rendererjs.Renderer.prototype.zipFiles = function(fileArr, callback) {
      var url, fileName;
      var fileDataArr = [];

      function zipFiles() {
        var zip = jszip();
        var zipDataArr = [];
        var contents;
        var byteLength = 0;

        for (var i=0; i<fileDataArr.length; i++) {
          // maximum zip file size is 20 MB
          if (byteLength + fileDataArr[i].data.byteLength <= 20971520) {
            byteLength += fileDataArr[i].data.byteLength;
            zip.file(fileDataArr[i].name, fileDataArr[i].data);
          } else {
            // generate the zip file contents for the current chunk of files
            contents = zip.generate({type:"arraybuffer"});
            zipDataArr.push(contents);
            // create a new zip for the next chunk of files
            zip = jszip();
            byteLength = fileDataArr[i].data.byteLength;
            zip.file(fileDataArr[i].name, fileDataArr[i].data);
          }
          // generate the zip file contents for the last chunk of files
          if (i+1>=fileDataArr.length) {
            contents = zip.generate({type:"arraybuffer"});
            zipDataArr.push(contents);
          }
        }

        return zipDataArr;
      }

      function addFile(fName, fData) {
        fileDataArr.push({name: fName, data: fData});

        if (fileDataArr.length === fileArr.length) {
          // all files have been read so generate the zip files' contents
          callback(zipFiles());
        }
      }

      for (var i=0; i<fileArr.length; i++) {
        if (fileArr[i].remote) {
          url = fileArr[i].url;
          fileName = url.substring(url.lastIndexOf('/') + 1);
        } else {
          fileName = fileArr[i].name;
        }
        this.readFile(fileArr[i], 'readAsArrayBuffer', addFile.bind(null, fileName));
      }
    };

    /**
     * Unzip the contents of a zip file.
     *
     * @param {Array} ArrayBuffer corresponding to the zip file data.
     * @return {Array} array of objects where each object has the properties name: the file
     * name and data: the file's data.
     */
     rendererjs.Renderer.prototype.unzipFileData = function(zData) {
      var zip = jszip(zData);
      var fileDataArr = [];

      for (var name in zip.files) {
        fileDataArr.push({name: name, data: zip.file(name).asArrayBuffer()});
      }
      return fileDataArr;
    };

    /**
     * Static method to determine if a File object is a supported neuroimage type.
     *
     * @param {Object} HTML5 File object
     * @return {String} the type of the image: 'dicom', 'dicomzip', 'vol', 'fibers', 'mesh',
     * 'thumbnail', 'json' or 'unsupported'
     */
     rendererjs.Renderer.imgType = function(file) {
      var ext = {};
      var type;
      var name = file.name;

      // dicom extensions
      ext.DICOM = ['.dcm', '.ima', '.DCM', '.IMA'];
      // zipped dicom extensions
      ext.DICOMZIP = ['.dcm.zip', '.DCM.zip', '.ima.zip', '.IMA.zip'];
      // volume extensions
      ext.VOL = ['.mgh', '.mgz', '.nrrd', '.nii', '.nii.gz'];
      // fibers extension is .trk
      ext.FIBERS = ['.trk'];
      // geometric model extensions
      ext.MESH = ['.obj', '.vtk', '.stl'];
      // thumbnail extensions
      ext.THUMBNAIL = ['.png', '.gif', '.jpg'];
      // json extensions
      ext.JSON = ['.json'];

      // here we assume that DICOM file names with no extension only contain digits after the last dot

      if ( (name.indexOf('.')===-1) || util.strEndsWith(name, ext.DICOM) || (/^\d+$/.test(name.split('.').pop())) ) {
        type = 'dicom';

      } else if (util.strEndsWith(name, ['.zip'])) {
        type = 'dicomzip';

        if (!util.strEndsWith(name, ext.DICOMZIP)) {

          // check if the zipping might have been performed on a DICOM file with no extension in its name
          if (name.slice(0, name.lastIndexOf('.')).indexOf('.')!==-1) {
            var nameArr = name.split('.');
            nameArr.pop();

            if (!(/^\d+$/.test(nameArr.pop()))) {
              type = 'unsupported';
            }
          }
        }

      } else if (util.strEndsWith(name, ext.VOL)) {
        type = 'vol';

      } else if (util.strEndsWith(name, ext.FIBERS)) {
        type = 'fibers';

      } else if (util.strEndsWith(name, ext.MESH)) {
        type = 'mesh';

      } else if (util.strEndsWith(name, ext.THUMBNAIL)) {
        type = 'thumbnail';

      } else if (util.strEndsWith(name, ext.JSON)) {
        type = 'json';

      } else {
        type = 'unsupported';
      }

      return type;
    };

    /**
     * Static method to parse a dicom file. Raises an exception if the parsing fails.
     *
     * @return {Object} the dicom info object
     */
     rendererjs.Renderer.parseDicom = function(dicomFileData) {

      // Here we use Chafey's dicomParser: https://github.com/chafey/dicomParser.
      // dicomParser requires as input a Uint8Array so we create it here
      var byteArray = new Uint8Array(dicomFileData);
      // Invoke the parseDicom function and get back a DataSet object with the contents
      var dataSet = dicomParser.parseDicom(byteArray);

      // Access any desire property using its tag
      return {
        patientName: dataSet.string('x00100010'),
        patientId: dataSet.string('x00100020'),
        patientBirthDate: dataSet.string('x00100030'),
        patientAge: dataSet.string('x00101010'),
        patientSex: dataSet.string('x00100040'),
        seriesDescription: dataSet.string('x0008103e'),
        manufacturer: dataSet.string('x00080070'),
        studyDate: dataSet.string('x00080020')
      };
    };


    return rendererjs;
  });
