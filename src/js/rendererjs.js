define(
  [
  // bower components
  '../../../jszip/dist/jszip',
  '../../../dicomParser/dist/dicomParser',
  '../../../utiljs/src/js/utiljs',

  // html templates (requires the 'text' bower component)
  '../../../text/text!../templates/rendererwin.html',

  // relative paths to local non-AMD modules
  './lib/xtk',
  './lib/jpegmin',
  './lib/lossless',
  './lib/jpx',

  // jquery is special because it is AMD but doesn't return an object
  'jquery_ui'

  ], function(jszip, dicomParser, util, rendererwin) {

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
     *  -orientation: renderer's main orientation, either of the strings: 'X', 'Y' or 'Z'
     * @param {Object} optional file manager object to enable reading of files from the
     * cloud or from HTML5 sandboxed filesystem.
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

      // renderer's orientation
      this.orientation = 'Z';
      if (options.orientation) {this.orientation = options.orientation;}

      // xtk renderer object
      this.renderer = null;

      // xtk volume object
      this.volume = null;

      // whether the renderer's window is maximized
      this.maximized = false;

      // whether the renderer's window is selected
      this.selected = false;

      // file manager object
      this.fileManager = null;
      if (fileManager) {this.fileManager = fileManager;}

      // associated image file object
      this.imgFileObj = null;

      // renderer status (true when the rendering failed)
      this.error = false;

      // JSON object with the mri meta information if available
      this.mriInfo = null;

      // jQuery object for the info's dialog window
      this.infoWin = null;
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
     *  -json: Optional HTML5 or custom File object (optional json file with the mri info for imgType different from 'dicom')
     * @param {Function} optional callback to be called when the renderer is ready. If the rendering failed then the
     * renderer's error property is set to true.
     */
    rendererjs.Renderer.prototype.init = function(imgFileObj, callback) {
      var self = this;

      self.imgFileObj = imgFileObj;
      self.createUI();
      self.createRenderer();
      self.createVolume();

      self.readVolumeFiles(function() {

        self.renderVolume(function() {

          // renderer ready
          if (callback) { callback(); }
        });
      });
    };

    /**
     * Create and initialize the renderer's HTML UI.
     */
    rendererjs.Renderer.prototype.createUI = function() {
      var self = this;

      var url = self.imgFileObj.baseUrl + self.imgFileObj.files[0].name;

      // add the appropriate classes to the renderer container
      self.container.addClass('view-renderer');

      // append template html interface to the renderer's container
      var template = $(rendererwin);
      self.container.append(template.filter('.view-renderer-titlebar'));
      self.container.append(template.filter('.view-renderer-content'));

      // set title's bar caption
      $('.view-renderer-titlebar-title', self.container).text(url);

      // add the appropriate classes to the title bar elements
      var jqButtons = $('button', self.container);

      jqButtons.addClass('ui-button ui-widget ui-state-default ui-corner-all');
      $('span', jqButtons).addClass('ui-button-icon-primary ui-icon');

      jqButtons.mouseover(function() {

        return $(this).addClass('ui-state-hover');

      }).mouseout(function() {

        return $(this).removeClass('ui-state-hover');

      }).focus(function() {

        return $(this).addClass('ui-state-focus');

      }).blur(function() {

        return $(this).removeClass('ui-state-focus');
      });

      // buttons' event handlers
      jqButtons.click(function(evt) {

        var jqBtn = $(this);

        if (jqBtn.hasClass('view-renderer-titlebar-buttonpane-close')) {

          self.onRendererClose(evt);

        } else if (jqBtn.hasClass('view-renderer-titlebar-buttonpane-maximize')) {

          if (self.maximized) {

            self.restore();

          } else {

            self.maximize();
          }

          self.onRendererChange(evt);

        } else if (jqBtn.hasClass('view-renderer-titlebar-buttonpane-pin')) {

          if (self.selected) {

            self.deselect();

          } else {

            self.select();
          }

          self.onRendererChange(evt);

        } else if (jqBtn.hasClass('view-renderer-titlebar-buttonpane-info')) {

          self.infoWin.dialog('open');
        }
      });

      self.initInfoWindow();
    };

    /**
     * Initilize Mail window's HTML and event handlers.
     */
    rendererjs.Renderer.prototype.initInfoWindow = function() {
      var self = this;

      var infoWin = $('<div></div>');
      self.infoWin = infoWin;

      // convert the previous div into a floating window with a close button
      infoWin.dialog({
        title: 'Volume info',
        modal: true,
        autoOpen: false,
        minHeight: 400,
        height: 500,
        minWidth: 700,
        width: 800
      });

      // add the HTML contents to the floating window
      infoWin.append('<div class="view-renderer-infowin">No MRI meta information was provided.</div>');
    };

    /**
     * Maximize the renderer's window
     */
    rendererjs.Renderer.prototype.maximize = function() {

      var jqBtn = $('.view-renderer-titlebar-buttonpane-maximize', this.container);

      jqBtn.attr('title', 'Restore');

      // toggle icon classes from maximize to restore
      jqBtn.find('span').removeClass('ui-icon-extlink').addClass('ui-icon-newwin');

      // save the current renderer's dimensions
      this.height = this.container.css('height');
      this.width = this.container.css('width');

      // style renderer
      this.container.css({display: 'block', height: '100%', width: '100%'});

      util.documentRepaint();
      this.maximized = true;

      if (!this.selected) {

        this.select();
      }
    };

    /**
     * Restore the renderer's window to its original size
     */
    rendererjs.Renderer.prototype.restore = function() {

      var jqBtn = $('.view-renderer-titlebar-buttonpane-maximize', this.container);

      jqBtn.attr('title', 'Maximize');

      // toggle icon classes from restore to maximize
      jqBtn.find('span').removeClass('ui-icon-newwin').addClass('ui-icon-extlink');

      // style renderer
      this.container.css({display: 'block', height: this.height, width: this.width});

      util.documentRepaint();
      this.maximized = false;
    };

    /**
     * Select the renderer's window
     */
    rendererjs.Renderer.prototype.select = function() {

      var jqBtn = $('.view-renderer-titlebar-buttonpane-pin', this.container);

      jqBtn.attr('title', 'Selected');

      this.selected = true;

      // toggle icon classes from deselected to selected
      jqBtn.find('span').removeClass('ui-icon-pin-w').addClass('ui-icon-pin-s');
    };

    /**
     * Deselect the renderer's window
     */
    rendererjs.Renderer.prototype.deselect = function() {

      var jqBtn = $('.view-renderer-titlebar-buttonpane-pin', this.container);

      jqBtn.attr('title', 'Not selected');

      this.selected = false;

      // toggle icon classes from deselected to selected
      jqBtn.find('span').removeClass('ui-icon-pin-s').addClass('ui-icon-pin-w');
    };

    /**
     * This method is called everytime the renderer changes state.
     *
     * @param {Object} event object.
     */
    rendererjs.Renderer.prototype.onRendererChange = function(evt) {

      console.log('onRendererChange not overwritten!');
      console.log('event obj: ', evt);
    };

    /**
     * This method is called when the close button is clicked.
     *
     * @param {Object} event object.
     */
    rendererjs.Renderer.prototype.onRendererClose = function(evt) {

      // by default the renderer is just hidden
      this.container.css({display: 'none'});

      console.log('onRendererClose not overwritten!');
      console.log('event obj: ', evt);
    };

    /**
     * Create an XTK 2D renderer object and set the renderer property to that object.
     */
    rendererjs.Renderer.prototype.createRenderer = function() {
      var self = this;

      if (self.renderer) { return; }

      // create xtk object
      var r = new X.renderer2D();
      r.container = $('.view-renderer-content', self.container)[0];
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
      r.interactor.addEventListener('flipColumns', this.onRenderer2DFlipColumns);
      r.interactor.addEventListener('flipRows', this.onRenderer2DFlipRows);

      // called every time the pointing position is changed with shift+left-mouse
      r.addEventListener('onPoint', this.onRenderer2DPoint);

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

        for (var i = 0; i < imgFileObj.files.length; i++) {
          fileNames[i] = imgFileObj.files[i].name.replace('.zip', '');
        }

      } else {

        for (var j = 0; j < imgFileObj.files.length; j++) {
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

      switch (orientation) {

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
     * @param {Function} optional callback to be called when the renderer is ready. If
     * the rendering failed then the renderer's error property is set to true.
     */
    rendererjs.Renderer.prototype.renderVolume = function(callback) {
      var self = this;

      var r = self.renderer;
      var vol = self.volume;

      // the onShowtime event handler gets executed after all files were fully loaded and
      // just before the first rendering attempt
      r.afterRender = function() {

        self.renderedOnce = true;

        if (vol.status === 'INVALID') {

          // there were XTK errors while parsing the volume
          self.error = true;
          console.error('Could not render volume ' + self.imgFileObj.baseUrl);

          if (callback) { callback(); }

        } else {

          self.setUIMriInfo(function() {

            // renderer is ready
            if (callback) { callback(); }
          });
        }

        r.afterRender = function() {};
      };

      try {

        r.add(vol);

      } catch (err) {

        self.error = true;
        console.error('Could not render volume ' + self.imgFileObj.baseUrl + ' - ' + err);

        if (callback) { callback(); }

        return;
      }

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

    function setHTMLInfo() {

      var info = self.mriInfo;
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
        'SEX: ' + info.patientSex
      );

      $('.view-renderer-info-topright', jqR).html(
        'SERIES: ' + info.seriesDescription + '<br>' +
        info.manufacturer + '<br>' +
        info.studyDate + '<br>' +
        info.dimensions + '<br>' +
        info.voxelSizes
      );

      if (info.orientation) {
        orient = info.orientation + '<br>';
      }

      if (info.primarySliceDirection) {
        direct = info.primarySliceDirection;
      }

      $('.view-renderer-info-bottomright', jqR).html(
        orient + direct
      );

      self.updateUISliceInfo();

      if (info.metaHTML) {

        $('.view-renderer-infowin', self.infoWin).html(info.metaHTML);
      }

      // UI is ready
      if (callback) { callback(); }
    }

    if (imgFileObj.json) {

      // if there is a json file then read it
      self.readJSONFile(imgFileObj.json, function(jsonObj) {

        self.parseJSONData(jsonObj);

        setHTMLInfo();
      });

    } else if (imgFileObj.dicomInfo) {

      // if instead there is dicom information then use it
      self.mriInfo = imgFileObj.dicomInfo;

      self.mriInfo.dimensions = (vol.range[0]) + ' x ' + (vol.range[1]) + ' x ' + (vol.range[2]);
      self.mriInfo.voxelSizes = vol.spacing[0].toPrecision(4) + ', ' + vol.spacing[1].toPrecision(4) +
      ', ' + vol.spacing[2].toPrecision(4);

      setHTMLInfo();

    } else {

      // just display slice number
      self.updateUISliceInfo();

      // UI is ready
      if (callback) { callback(); }
    }
  };

    /**
     * Generate a thumbnail's image data from a snapshot of the internal canvas.
     *
     * @param {Function} callback whose argument is the thumbnail's image data.
     */
    rendererjs.Renderer.prototype.getThumbnail = function(callback) {
    var self = this;
    var r = self.renderer;

    var getThumbnail = function() {

      var canvas = $('canvas', self.container)[0];

      self.readFile(util.dataURItoJPGBlob(canvas.toDataURL('image/jpeg')), 'readAsDataURL', function(thData) {

        callback(thData);
      });
    };

    //
    // thumbnail can be generated only after the first rendering has happen
    //
    r.afterRender = function() {

      if (!self.renderedOnce) {

        self.renderedOnce = true;
        getThumbnail();
      }
    };

    if (self.renderedOnce) {

      getThumbnail();

    } else {

      // start a rendering
      r.render();
      util.documentRepaint();
    }
  };

    /**
     * Change renderer's orientation.
     *
     * @param {String} renderer's orientation: 'X' or 'Y' or 'Z'.
     * @param {Function} optional callback to be called when the renderer is ready.
     */
    rendererjs.Renderer.prototype.changeOrientation = function(orientation, callback) {

      if (this.orientation !== orientation) {

        this.orientation = orientation;
        this._destroyRenderer();
        this.createRenderer();
        this.renderVolume(function() {

          // renderer ready
          if (callback) { callback(); }
        });

      } else {

        // passed orientation is the current orientation so renderer already ready
        if (callback) { callback(); }
      }
    };

    /**
     * Private method to destroy internal XTK's renderer object.
     */
    rendererjs.Renderer.prototype._destroyRenderer = function() {
      var r = this.renderer;

      if (r) {

        r.remove(this.volume);
        r.interactor.removeEventListener(X.event.events.SCROLL, this.onRenderer2DScroll);
        r.interactor.removeEventListener(X.event.events.ZOOM, this.onRenderer2DZoom);
        r.interactor.removeEventListener(X.event.events.PAN, this.onRenderer2DPan);
        r.interactor.removeEventListener(X.event.events.ROTATE, this.onRenderer2DRotate);
        r.interactor.removeEventListener('flipColumns', this.onRenderer2DFlipColumns);
        r.interactor.removeEventListener('flipRows', this.onRenderer2DFlipRows);
        r.removeEventListener('onPoint', this.onRenderer2DPoint);
        r.destroy();
      }

      this.renderer = null;
    };

    /**
     * Destroy all objects and remove html interface
     */
    rendererjs.Renderer.prototype.destroy = function() {

      // destroy XTK renderer
      this._destroyRenderer();

      // destroy XTK volume
      if (this.volume) { this.volume.destroy(); }

      // remove html
      this.container.empty();

      // clear objects
      this.volume = null;
      this.maximized = false;
      this.fileManager = null;
      this.imgFileObj = null;
    };

    /**
     * Parse a JSON data object.
     */
    rendererjs.Renderer.prototype.parseJSONData = function(jsonObj) {

      if (jsonObj) {

        this.mriInfo = {
          patientName: jsonObj.PatientName,
          patientId: jsonObj.PatientID,
          patientBirthDate: jsonObj.PatientBirthDate,
          patientSex: jsonObj.PatientSex,
          seriesDescription: jsonObj.SeriesDescription,
          manufacturer: jsonObj.Manufacturer,
          studyDate: jsonObj.StudyDate
        };

        if (jsonObj.mri_info) {

          this.mriInfo.orientation = jsonObj.mri_info.orientation;
          this.mriInfo.primarySliceDirection = jsonObj.mri_info.primarySliceDirection;
          this.mriInfo.dimensions = jsonObj.mri_info.dimensions;
          this.mriInfo.voxelSizes = jsonObj.mri_info.voxelSizes;
        }

        if (jsonObj.thumbnail) {

          this.mriInfo.thumbnailLabel = jsonObj.thumbnail.label;
          this.mriInfo.thumbnailTooltip = jsonObj.thumbnail.tooltip;
        }

        if (jsonObj.meta) {

          this.mriInfo.metaHTML = jsonObj.meta.html;
        }
      }
    };

    /**
     * Read the local or remote volume files.
     *
     * @param {Function} callback to be called when all volume files have been read.
     */
    rendererjs.Renderer.prototype.readVolumeFiles = function(callback) {
      var self = this;

      var imgFileObj = self.imgFileObj;
      var vol = self.volume;
      var numFiles = 0;
      var filedata = [];

      // function to read a single volume file
      function readFile(file, ix) {

        self.readFile(file, 'readAsArrayBuffer', function(data) {
          filedata[ix] = data;
          ++numFiles;

          if (numFiles === imgFileObj.files.length) {

            if (imgFileObj.imgType === 'dicom' || imgFileObj.imgType === 'dicomzip') {

              // if the files are zip files of dicoms then unzip them and sort the resultant files
              if (imgFileObj.imgType === 'dicomzip') {
                var fDataArr = [];

                for (var i = 0; i < filedata.length; i++) {
                  fDataArr = fDataArr.concat(self.unzipFileData(filedata[i]));
                }

                fDataArr = util.sortObjArr(fDataArr, 'name');

                filedata = [];
                var urls = [];

                for (i = 0; i < fDataArr.length; i++) {

                  filedata.push(fDataArr[i].data);
                  urls.push(imgFileObj.baseUrl + fDataArr[i].name);
                }

                vol.file = urls;
              }

              try {

                imgFileObj.dicomInfo = rendererjs.Renderer.parseDicom(filedata[0]);

              } catch (err) {

                console.log('Could not parse dicom ' + imgFileObj.baseUrl + ' Error - ' + err);
              }
            }

            vol.filedata = filedata;
            callback();
          }
        });
      }

      // read all neuroimage files in imgFileObj.files
      for (var i = 0; i < imgFileObj.files.length; i++) {

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
      var self = this;

      var reader = new FileReader();

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

        for (var i = 0; i < fileDataArr.length; i++) {

          // maximum zip file size is 20 MB
          if (byteLength + fileDataArr[i].data.byteLength <= 20971520) {

            byteLength += fileDataArr[i].data.byteLength;
            zip.file(fileDataArr[i].name, fileDataArr[i].data);

          } else {

            // generate the zip file contents for the current chunk of files
            contents = zip.generate({type: 'arraybuffer'});
            zipDataArr.push(contents);

            // create a new zip for the next chunk of files
            zip = jszip();
            byteLength = fileDataArr[i].data.byteLength;
            zip.file(fileDataArr[i].name, fileDataArr[i].data);
          }

          // generate the zip file contents for the last chunk of files
          if (i + 1 >= fileDataArr.length) {

            contents = zip.generate({type: 'arraybuffer'});
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

      for (var i = 0; i < fileArr.length; i++) {

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

      if ((name.indexOf('.') === -1) || util.strEndsWith(name, ext.DICOM) || (/^\d+$/.test(name.split('.').pop()))) {
        type = 'dicom';

      } else if (util.strEndsWith(name, ['.zip'])) {
        type = 'dicomzip';

        if (!util.strEndsWith(name, ext.DICOMZIP)) {

          // check if the zipping might have been performed on a DICOM file with no extension in its name
          if (name.slice(0, name.lastIndexOf('.')).indexOf('.') !== -1) {
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
