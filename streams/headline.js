"use strict";
debugger;

var VectorWatch = require('vectorwatch-sdk');
var request = require('request');

var vectorWatch = new VectorWatch();
var logger = vectorWatch.logger;

// ----------------------------------- News ------------------------------------

// Remove things we don't want
var decode = function(str) {
  str = str.replace(/&amp;/g, '&');
  str = str.replace('<![CDATA[', '');
  str = str.replace(']]>', '');
  return str;
};

var parseFeed = function(responseText) {
  var items = [];
  var longestTitle = 0;
  var longestDesc = 0;
  var outerSpool = responseText;
 
  // Strip heading data
  outerSpool = outerSpool.substring(outerSpool.indexOf('<item>'));
  
  // For all stories
  while(outerSpool.indexOf('<title>') > 0) {
    var s = {};
    var spool = outerSpool.substring(0, outerSpool.indexOf('</item>'));
 
    // Title
    var title = spool.substring(spool.indexOf('<title>') + '<title>'.length);
    title = title.substring(0, title.indexOf('</title>'));
    if(title.indexOf('VIDEO') > -1) {
      title = title.substring(7);
    }
    s.title = decode(title);
 
    // Description
    var desc = spool.substring(spool.indexOf('<description>') + '<description>'.length);
    desc = desc.substring(0, desc.indexOf('</description>'));
    s.description = decode(desc);
 
    // Add
    items.push(s);
    outerSpool = outerSpool.substring(outerSpool.indexOf('</item>') + '</item>'.length);
  }
 
  logger.info('parseFeed(): Extracted ' + items.length + ' items.');
  return items;
};

function getHeadline(cb) {
    var url = 'http://feeds.bbci.co.uk/news/rss.xml';
    request(url, function(err, response, responseText) {
        var spool = responseText.substring(responseText.indexOf('<item>') + '<item>'.length);
        var stories = parseFeed(spool);
        var headline = stories[0].title;
        cb(headline);
    });
}

// ---------------------------------- Events -----------------------------------

vectorWatch.on('schedule', function(records) {
    getHeadline(function(headline) {
        records.forEach(function(record) {  // Once per update, save hitting API
            record.pushUpdate(headline);
        });
    });  
});

vectorWatch.on('subscribe', function(event, response) {
    getHeadline(function(headline) {
        response.setValue(headline);
        response.send();
    });
});
