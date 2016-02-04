require.config({
  baseUrl: '../',
  paths: {
    gapi: 'https://apis.google.com/js/api',
    utiljs: '../utiljs/src/js/utiljs',
    fmjs: '../fmjs/src/js/fmjs',
    jquery: ['https://ajax.googleapis.com/ajax/libs/jquery/1.11.2/jquery.min', '../jquery/dist/jquery.min'],
    jquery_ui: ['https://ajax.googleapis.com/ajax/libs/jqueryui/1.11.2/jquery-ui.min', '../jquery-ui/jquery-ui.min']
  },
  // deps: ['rendererjsPackage'],
  packages: [
  {
    name: 'rendererjsPackage', // used for mapping...
    location: 'src',   // relative to base url
    // main: 'rendererjs' // relative to package folder
  }
  ]
});
