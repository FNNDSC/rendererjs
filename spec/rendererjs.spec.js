/**
 * This module implements the renderer's specification (tests).
 *
 */

define(['rendererjs'], function(rendererjs) {

  describe('rendererjs', function() {
    var r;

    // renderer options object
    var options = {
      container: document.getElementById('renderercontainer'),
      rendererId: 'renderercontent',
      orientation: 'Z'
    };

    // Append container div
    $(document.body).append('<div id="renderercontainer"></div>');

    beforeEach(function() {
      r = new rendererjs.Renderer(options);
    });

    it('rendererjs.Renderer.prototype.getVolProps("Z") returns 2',
      function() {
        expect(r.getVolProps('Z').rangeInd).toEqual(2);
      }
    );

  });
});
