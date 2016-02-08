require(['./config'], function() {
  require(['rendererjsPackage', 'fmjs', 'jquery', 'jquery_ui'], function(renderer, fm, $) {
  // Entry point

  // Create a file manager object (optional)
  var CLIENT_ID = '1050768372633-ap5v43nedv10gagid9l70a2vae8p9nah.apps.googleusercontent.com';
  var driveFm = new fm.GDriveFileManager(CLIENT_ID);

  // renderer options object
  var options = {
    container: document.getElementById('renderercontainer'),
    rendererId: 'renderercontent',
    orientation: 'Z'
  };

  // Event handler for the directory loader button
  var dirBtn = document.getElementById('dirbtn');

  var destroyRenderer = function(r) {

    r.destroy();
    $('#thumbnail').css('display', 'none');
    dirBtn.disabled = false;
  };

  dirBtn.onchange = function(e) {

    var files = e.target.files;

    if (files.length) { dirBtn.disabled = true; }

    // Create a renderer. The second parameter (a file manager) is optional and only required
    // if files are going to be loaded from GDrive
    var r = new renderer.Renderer(options, driveFm);

    // overwrite event handler for the renderer's close button
    r.onRendererClose = function() {

      destroyRenderer(r);
    };

    var initCallback = function() {

      if (r.error) {

        destroyRenderer(r);

      } else {

        r.getThumbnail(function(thData) {

          $('#thumbnail').css('display', 'block');
          $('img').attr('src', thData);
        });
      }
    };

    // Image file object
    var imgFileObj = {
      baseUrl: '/',
      files: []
    };

    if (files[0] && ('webkitRelativePath' in files[0])) {

      imgFileObj.baseUrl = files[0].webkitRelativePath;
    }

    for (var i = 0; i < files.length; i++) {

      if (renderer.Renderer.imgType(files[i]) === 'vol' || renderer.Renderer.imgType(files[i]) === 'dicom' ||
        renderer.Renderer.imgType(files[i]) === 'dicomzip') {

        imgFileObj.imgType = renderer.Renderer.imgType(files[i]);

        if ((imgFileObj.imgType === 'dicom') || (imgFileObj.imgType === 'dicomzip')) {

          // dicom and dicomzip formats contain several files
          imgFileObj.files = files;

        } else {

          // for other formats only render this volume
          imgFileObj.files.push(files[i]);

          // also grab the first JSON file with MRI information if there is any
          for (i = 0; i < files.length; i++) {

            if (renderer.Renderer.imgType(files[i]) === 'json') {
              imgFileObj.json = files[i];
              break;
            }
          }
        }

        // initialize the renderer
        r.init(imgFileObj, initCallback);

        break;
      }
    }
  };

});
});
