require.config({
  baseUrl: '../bower_components',
  paths: {

    // third party components
    jquery: ['https://ajax.googleapis.com/ajax/libs/jquery/1.11.2/jquery.min', 'jquery/dist/jquery.min'],
    jquery_ui: ['https://ajax.googleapis.com/ajax/libs/jqueryui/1.11.2/jquery-ui.min', 'query-ui/jquery-ui.min'],
    text: 'text/text',
    jszip: 'jszip/dist/jszip',
    dicomParser: 'dicomParser/dist/dicomParser'
  },

  // use packages to be able to use relative paths in our bower components
  packages: [

    // our bower packages
     {
       name: 'utiljsPackage', // used for mapping...
       location: 'utiljs/src',   // relative to base url
       main: 'js/utiljs'
     },

     {
       name: 'fmjsPackage',
       location: 'fmjs/src',
       main: 'js/fmjs'
     },

    {
      name: 'rendererjsPackage',
      location: 'rendererjs/src',
      main: 'js/rendererjs'
    }
  ]

});
