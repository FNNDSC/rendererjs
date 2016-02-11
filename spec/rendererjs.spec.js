/**
 * This module implements the renderer's specification (tests).
 *
 */

define(['rendererjs'], function(rendererjs) {

  describe('rendererjs', function() {

    window.jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;

    // Image file object
    var imgFileObj = {
      baseUrl: 'volumes/nii/',
      imgType: 'vol',
      files: [{url: 'volumes/nii/s34654_df.nii', name: 's34654_df.nii', remote: true}],
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

      it('rendererjs.Renderer.prototype.readFile reads a file',

        function(done) {

          r.readFile({'url': 'volumes/nii/s34654_df.nii', 'remote': true}, 'readAsArrayBuffer', function(data) {

            expect(data.byteLength).toBeGreaterThan(0);
            done();
          });
        }
      );
    });
  });
});
