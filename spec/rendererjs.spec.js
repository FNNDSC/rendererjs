/**
 * This module implements the renderer's specification (tests).
 *
 */

define(['rendererjs'], function(rendererjs) {

  describe('rendererjs', function() {

    window.jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;

    // Image file object
    var imgFileObj = {
      baseUrl: 'volumes/nii/volumes/nii/s34654_df.nii',
      imgType: 'vol',
      files: [{'url': 'volumes/nii/s34654_df.nii', 'remote': true}],
      json: {'url': 'json/s34654_df.json', 'remote': true}
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

    var createRenderer = function() {

      // append container for the xtk renderer
      container.append('<div id="xtkrenderercont"></div>');

      r = new rendererjs.Renderer(options);

      r.imgFileObj = imgFileObj;
    };

    describe('rendererjs initialization', function() {

      beforeEach(function() {

        createRenderer();
      });

      afterEach(function() {

        // Destroy renderer
        r.destroy();
      });

      it('rendererjs.Renderer.prototype.createUI() creates the renderer UI',

        function() {

          r.createUI();

          expect(r.container.hasClass('view-renderer')).toEqual(true);
        }
      );

      it('rendererjs.Renderer.prototype.createRenderer() creates internal 2D XTK renderer',

        function() {

          r.createRenderer();
          expect(r.renderer.classname).toEqual('renderer2D');
        }
      );

      it('rendererjs.Renderer.prototype.createVolume() creates internal XTK volume object',

        function() {

          r.createVolume();
          expect(r.volume.classname).toEqual('volume');
        }
      );

      it('rendererjs.Renderer.prototype.readVolumeFiles() reads the volume file',

        function(done) {

          r.createVolume();

          r.readVolumeFiles(function() {

            //expect(r.volume.filedata).toEqual(window.jasmine.any(Object));
            expect(r.volume.filedata.length).toBeGreaterThan(0);
            done();
          });
        }
      );

      /*it('rendererjs.Renderer.prototype.renderVolume() renders the volume file',

        function(done) {

          r.createUI();
          r.createRenderer();
          r.createVolume();

          r.readVolumeFiles(function() {

            r.renderVolume(function() {

              expect(r.volume.filedata).toEqual(window.jasmine.any(Object));
              done();
            });
          });
        }
      );*/
    });

    describe('rendererjs behaviour', function() {

      beforeEach(function() {

        createRenderer();
        //r.createRenderer();
        //r.createVolume();
      });

      afterEach(function() {

        // Destroy renderer
        r.destroy();
      });

      it('rendererjs.Renderer.prototype.getVolProps("Z") returns 2',

        function() {

          expect(r.getVolProps('Z').rangeInd).toEqual(2);
        }
      );

      it('rendererjs.Renderer.prototype.readJSONFile reads a JSON file',

        function(done) {

          r.readJSONFile({'url': 'json/s34654_df.json', 'remote': true}, function(data) {

            expect(data.PatientName).toEqual('Bob');
            done();
          });
        }
      );
    });
  });
});
