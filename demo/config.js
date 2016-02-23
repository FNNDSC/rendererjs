require.config({
  baseUrl: '../bower_components',
  paths: {

    // third party components
    jquery: ['https://ajax.googleapis.com/ajax/libs/jquery/1.11.2/jquery.min', 'jquery/dist/jquery.min'],
    jquery_ui: ['https://ajax.googleapis.com/ajax/libs/jqueryui/1.11.2/jquery-ui.min', 'jquery-ui/jquery-ui.min'],
  },

  // use packages to be able to use relative paths
  packages: [

    {
      name: 'rendererjs', // used for mapping...
      location: './', // relative to base url
      main: 'rendererjs/src/js/rendererjs'
    },

    {
      name: 'fmjs',
      location: 'fmjs/src',
      main: 'js/fmjs'
    },
  ]

});
