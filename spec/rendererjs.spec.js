/**
 * This module implements the renderer's specification (tests).
 *
 */

define(['rendererjs'], function(rendererjs) {

  describe('rendererjs', function() {

    window.jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;

    var testDataDir = 'bower_components/mri_testdata/';

    // Image file object
    var imgFileObj = {
      baseUrl: testDataDir + 'volumes/nii/',
      imgType: 'vol',
      files: [{url: testDataDir + 'volumes/nii/s34654_df.nii', name: 's34654_df.nii', remote: true}],
      json: {'url': testDataDir + 'json/s34654_df.json', name: 's34654_df.json', 'remote': true}
    };

    // append a container for the whole renderer
    var container = $('<div></div>');
    $(document.body).append(container);

    var r; // renderer

    // renderer options object
    var options = {
      container: container,
      rendererId: 'xtkrenderercont',
      orientation: 'Z'
    };

    describe('rendererjs initialization', function() {

      beforeEach(function() {

        r = new rendererjs.Renderer(options);
        r.imgFileObj = imgFileObj;
      });

      afterEach(function() {

        // Destroy renderer
        r.destroy();
      });

      it('rendererjs.Renderer.prototype.createUI() creates the renderer UI',

        function() {

          r.createUI();

          expect(r.container.hasClass('view-renderer')).toEqual(true);

          // renderer window has a title bar
          expect(r.container.find('.view-renderer-titlebar').length).toEqual(1);

          // renderer window has a content
          var contentDiv = r.container.find('.view-renderer-content');
          expect(contentDiv.length).toEqual(1);
          expect(contentDiv.attr('id')).toEqual(r.rendererId);
        }
      );

      it('rendererjs.Renderer.prototype.createVolume() creates internal XTK volume object',

        function() {

          r.createVolume();
          expect(r.volume.classname).toEqual('volume');
        }
      );

      it('rendererjs.Renderer.prototype.createRenderer() creates internal 2D XTK renderer',

        function() {

          r.createUI();
          r.createRenderer();
          expect(r.renderer.classname).toEqual('renderer2D');
        }
      );

      it('rendererjs.Renderer.prototype.readVolumeFiles() reads the image volume',

        function(done) {

          r.createVolume();

          r.readVolumeFiles(function() {

            //expect(r.volume.filedata).toEqual(window.jasmine.any(Object));
            expect(r.volume.filedata.byteLength).toBeGreaterThan(0);
            done();
          });
        }
      );

      it('rendererjs.Renderer.prototype.renderVolume() renders the volume file',

        function(done) {

          r.createUI();
          r.createRenderer();
          r.createVolume();

          r.readVolumeFiles(function() {

            r.renderVolume(function() {

              expect(r.error).toBeFalsy();
              done();
            });
          });
        }
      );

      it('rendererjs.Renderer.prototype.init(imgFileObj) initializes the renderer',

        function(done) {

          r.init(imgFileObj, function() {

            expect(r.renderer.classname).toEqual('renderer2D');
            expect(r.volume.filedata.byteLength).toBeGreaterThan(0);
            expect(r.error).toBeFalsy();
            done();
          });
        }
      );
    });

    describe('rendererjs behaviour', function() {

      beforeEach(function(done) {

        r = new rendererjs.Renderer(options);

        r.init(imgFileObj, function() {

          done();
        });
      });

      afterEach(function() {

        // Destroy renderer
        r.destroy();
      });

      it('rendererjs.Renderer.prototype.readJSONFile reads a JSON file',

        function(done) {

          r.readJSONFile(imgFileObj.json, function(data) {

            expect(data.PatientName).toEqual('Bob');
            done();
          });
        }
      );

      it('rendererjs.Renderer.prototype.readFile reads a file',

        function(done) {

          r.readFile(imgFileObj.files[0], 'readAsArrayBuffer', function(data) {

            expect(data.byteLength).toBeGreaterThan(0);
            done();
          });
        }
      );

      it('rendererjs.Renderer.prototype.getVolProps("Z") returns volume properties',

        function() {

          expect(r.getVolProps('Z').rangeInd).toEqual(2);
        }
      );

      it('rendererjs.Renderer.prototype.changeOrientation changes renderer orientation',

        function(done) {

          r.changeOrientation('X', function() {

            expect(r.orientation).toEqual('X');

            r.changeOrientation('Y', function() {

              expect(r.orientation).toEqual('Y');
              done();
            });
          });
        }
      );

      it('rendererjs.Renderer.prototype.getTumbnail creates an image/jpeg DOMString',

        function(done) {

          r.getThumbnail(function(dataUrl) {

            expect(dataUrl).toContain('data:image/jpeg');
            done();
          });
        }
      );

      it('rendererjs.Renderer.prototype.zipFiles concats and zips files',

        function(done) {

          r.zipFiles([imgFileObj.files[0], imgFileObj.files[0]], function(zipArr) {

            expect(zipArr.length).toEqual(1);
            done();
          });
        }
      );

      it('rendererjs.Renderer.prototype.unzipFileData unzips the contents of a zip file',

        function(done) {

          r.zipFiles([imgFileObj.files[0], imgFileObj.json], function(zipArr) {

            var unzipArr = r.unzipFileData(zipArr[0]);

            expect(unzipArr.some(function(el) { return el.name === 's34654_df.nii'; })).toEqual(true);
            expect(unzipArr.some(function(el) { return el.name === 's34654_df.json'; })).toEqual(true);
            done();
          });
        }
      );

      it('rendererjs.Renderer.prototype.parseJSONData parses a JSON obj for requiered properties',

        function(done) {

          r.readJSONFile(imgFileObj.json, function(jsonObj) {

            r.parseJSONData(jsonObj);

            expect(r.mriInfo.patientName).toEqual('Bob');
            expect(r.mriInfo.patientId).toEqual('111111');
            expect(r.mriInfo.patientBirthDate).toEqual('20000101');
            expect(r.mriInfo.patientSex).toEqual('M');
            expect(r.mriInfo.seriesDescription).toEqual('Some MRI Scan');
            expect(r.mriInfo.manufacturer).toEqual('Siemens');
            expect(r.mriInfo.studyDate).toEqual('20160510');
            expect(r.mriInfo.orientation).toEqual('LPS');
            expect(r.mriInfo.primarySliceDirection).toEqual('axial');
            expect(r.mriInfo.dimensions).toEqual('128 x 128 x 52');
            expect(r.mriInfo.voxelSizes).toEqual('2.0000, 2.0000, 2.0000');

            done();
          });
        }
      );
    });
  });
});
