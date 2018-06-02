/* ravenmyst */

var util = require("util"),
    http = require("http"),
    fs = require('fs');

var parsed_url = "http://ia601901.us.archive.org/4/items/..";

function download_file_httpget (host, match_array) {

  // get first element in array, we are done if array is empty.
  if (match_array === undefined || match_array.length == 0) {
    console.log('All files have been downloaded to /new.');
    return;
  }

  var path = match_array.slice(-1).pop();
  
  var file_name = path.split('/').pop();
  file_name = file_name
      .replace(/%20/g, " ")
      .replace(/%28/g, "(")
      .replace(/%29/g, ")")
      .replace(/%2c/g, ",")
      .replace(/%27/g, "'")
      .replace(/%21/g, "!")
      .replace(/%2b/g, "+")
    ;
  var file = fs.createWriteStream("new/" + file_name);

  console.log("requesting: " + host + path);

  http.get( host + path, function(download_handler) {
    download_handler.on('data', function(data) {
              file.write(data);
          }).on('end', function() {
              file.end();
              console.log(file_name + ' downloaded to /new.');
              // remove from array 
              match_array.pop();

              download_file_httpget(host, match_array);
          });
      });
}

  http.get(parsed_url, (res) => {
  const { statusCode } = res;
  const contentType = res.headers['content-type'];

  let error;
  if (statusCode !== 200) {
    error = new Error('Request Failed.\n' +
                      `Status Code: ${statusCode}`);
  } else if (!/^text\/html/.test(contentType)) {
    error = new Error('Invalid content-type.\n' +
                      `Expected text/html but received ${contentType}`);
  }
  if (error) {
    console.error(error.message);
    // consume response data to free up memory
    res.resume();
    return;
  }

  res.setEncoding('utf8');
  let rawData = '';
  res.on('data', (chunk) => { rawData += chunk; });
  res.on('end', () => {
    try {

      // get download locations
      var regex = /(?<=href=\")(.*(?=\"))/g;
      var matches = rawData.match(regex);

      processMatches(matches);

    } catch (e) {
      console.error(e.message);
    }
  });
}).on('error', (e) => {
  console.error(`Got error: ${e.message}`);
});


function processMatches(matches) {
  var match_array = [];

  for (var i = 0; i < matches.length; i += 1) {
    // get hostname 
    var host = parsed_url.substr( 7, parsed_url.length );
    host = host.substr( 0, host.indexOf('/') );
    host = "http://" + host;
    // get path
    var path = parsed_url.substr( 7, parsed_url.length );
    path = path.substr( path.indexOf('/'), path.length );
    path = path + matches[i];

    match_array.push(path);
  }

  // download
  download_file_httpget(host, match_array);
}
