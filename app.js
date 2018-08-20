/*
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* jshint node: true, devel: true */

'use strict';

const 
  bodyParser = require('body-parser'),
  config = require('config'),
  crypto = require('crypto'),
  express = require('express'),
  https = require('https'),  
  request = require('request');

var app = express();
app.set('port', process.env.PORT || 5000);
app.set('view engine', 'ejs');
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(express.static('public'));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

var cart_payload = '';
var cart_quantity = 0;

var dateFormat = require('dateformat');

var needle = require('needle');

var mysql = require('mysql');

var connection = mysql.createConnection({

});

connection.connect();

app.get('/contact', function(req, res){
  console.log('contact');
  res.sendFile('index.html', {root: path.join(__dirname, '/')});
});

// var menu = require('./menu.js');

/*
 * Be sure to setup your config values before running this code. You can 
 * set them using environment variables or modifying the config file in /config.
 *
 */
// App Secret can be retrieved from the App Dashboard
const APP_SECRET = (process.env.MESSENGER_APP_SECRET) ? 
  process.env.MESSENGER_APP_SECRET :
  config.get('appSecret');

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = (process.env.MESSENGER_VALIDATION_TOKEN) ?
  (process.env.MESSENGER_VALIDATION_TOKEN) :
  config.get('validationToken');

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
  (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
  config.get('pageAccessToken');

// URL where the app is running (include protocol). Used to point to scripts and 
// assets located at this address. 
const SERVER_URL = (process.env.SERVER_URL) ?
  (process.env.SERVER_URL) :
  config.get('serverURL');

const GOOGLE_KEY = (process.env.GOOGLE_KEY) ?
  (process.env.GOOGLE_KEY) :
  config.get('googleAPIKey');

  console.log(GOOGLE_KEY);


if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN && SERVER_URL)) {
  console.error("Missing config values");
  process.exit(1);
}

/*
 * Use your own validation token. Check that the token used in the Webhook 
 * setup is the same token used here.
 *
 */
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }  
});


/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page. 
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
app.post('/webhook', function (req, res) {
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        console.log('received fb message');
        if (messagingEvent.optin) {
          receivedAuthentication(messagingEvent);
        } else if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else if (messagingEvent.read) {
          receivedMessageRead(messagingEvent);
        } else if (messagingEvent.account_linking) {
          receivedAccountLink(messagingEvent);
        } else if(messagingEvent.referral.ref){
          var senderID = messagingEvent.sender.id;
          var ref = messagingEvent.referral.ref;
        
          processPostback(ref, senderID);  

        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've 
    // successfully received the callback. Otherwise, the request will time out.
    res.sendStatus(200);
  }
});


app.post('/broadcast', function(req, res){
  console.log('DONE');
  console.log(req.body);

  if(req.body.tempId == '1'){

  for(var x = 0; x < req.body.users.length; x++){
    var messageData = {
        recipient: {
          id: req.body.users[x].messenger_id
        },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: [{
                title: req.body.message,
                // subtitle: "Next-generation virtual reality",
                // item_url: "https://www.oculus.com/en-us/rift/",
                image_url: req.body.image_url,
                buttons: [{
                  type: "web_url",
                  url: req.body.link,
                  title: "Open Web URL"
                }]
              }]
            }
          }
        }
      };
    callSendAPI(messageData);
  }

  res.send({
    status: 'done'
  });

  }else if(req.body.tempId == '2'){

  for(var x = 0; x < req.body.users.length; x++){
    var messageData = {
        recipient: {
          id: req.body.users[x].messenger_id
        },
        message:{
          attachment:{
            type:"template",
            payload:{
              template_type:"button",
              text: req.body.message,
              buttons:[
                {
                  type:"postback",
                  title:"Start Chatting",
                  payload:"SAMPLE"
                }
              ]
            }
          }
        }
      };
    callSendAPI(messageData);
  }


  res.send({
    status: 'done'
  });


  }else if(req.body.tempId == '3'){

  for(var x = 0; x < req.body.users.length; x++){

     var messageData = {
        recipient: {
          id: req.body.users[x].messenger_id
        },
        message:{
          attachment:{
            type:"image",
            payload:{
              url:req.body.image_url
            }
          }
        }
      };
    callSendAPI(messageData);

      var text = req.body.message;
      sendTextMessage(req.body.users[x].messenger_id, text);

  }


  res.send({
    status: 'done'
  });


  }

});

app.post('/submit', function(req, res){
  console.log('DONE');
  console.log(req.body.MessengerId);
  var text = 'Your reservation is submitted successfully.! ;) \n\nReservation summary:\n\nName: '+req.body.Name+'\nContact: '+req.body.Contact+'\nDate: '+req.body.Rdate+'\nTime: '+req.body.Rtime;
  sendTextMessage(req.body.MessengerId, text);
  res.send(req.body.Message);
});



app.get('/authorize', function(req, res) {
  var accountLinkingToken = req.query.account_linking_token;
  var redirectURI = req.query.redirect_uri;

  // Authorization Code should be generated per user by the developer. This will 
  // be passed to the Account Linking callback.
  var authCode = "1234567890";

  // Redirect users to this URI on successful login
  var redirectURISuccess = redirectURI + "&authorization_code=" + authCode;

  res.render('authorize', {
    accountLinkingToken: accountLinkingToken,
    redirectURI: redirectURI,
    redirectURISuccess: redirectURISuccess
  });
});


  var GlobalMenu;
  

function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an 
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', APP_SECRET)
                        .update(buf)
                        .digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

/*
 * Authorization Event
 *
 * The value for 'optin.ref' is defined in the entry point. For the "Send to 
 * Messenger" plugin, it is the 'data-ref' field. Read more at 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/authentication
 *
 */
function receivedAuthentication(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfAuth = event.timestamp;

  // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
  // The developer can set this to an arbitrary value to associate the 
  // authentication callback with the 'Send to Messenger' click event. This is
  // a way to do account linking when the user clicks the 'Send to Messenger' 
  // plugin.
  var passThroughParam = event.optin.ref;

  console.log("Received authentication for user %d and page %d with pass " +
    "through param '%s' at %d", senderID, recipientID, passThroughParam, 
    timeOfAuth);

  // When an authentication is received, we'll send a message back to the sender
  // to let them know it was successful.
  sendTextMessage(senderID, "Authentication successful");
}

/*
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message' 
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
 *
 * For this example, we're going to echo any text that we get. If we get some 
 * special keywords ('button', 'generic', 'receipt'), then we'll send back
 * examples of those bubbles to illustrate the special message bubbles we've 
 * created. If we receive a message with an attachment (image, video, audio), 
 * then we'll simply confirm that we've received the attachment.
 * 
 */
function receivedMessage(event) {
  var senderID = event.sender.id;
  var senderName = event.sender.name;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;
  var day=dateFormat("yyyy-mm-dd h:MM:ss");

  console.log("Received message for payload %d user %d and page %d at %d with message:",
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var isEcho = message.is_echo;
  var messageId = message.mid;
  var appId = message.app_id;
  var metadata = message.metadata;

  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;
  var quickReply = message.quick_reply;

  var messageType;
  if(messageType = messageText){
    var messageType = 'Text';
  }else if(messageType = messageAttachments){
    var messageType = 'Generic';
  }else if(messageType = quickReply){
    var messageType = 'Quick Reply';
  }

  var user = {BotTag: 'SANGKAP', PageId: senderID, MessengerId: recipientID, MessageType: messageType, MessageId: messageId, SentDate: day};
  connection.query('INSERT INTO patsy_messages SET ?', user, function(err,res){
    if(err) throw err;
  });

  if (isEcho) {
    // Just logging message echoes to console
    console.log("Received echo for message %s and app %d with metadata %s",
      messageId, appId, metadata);
    return;
  } else if (quickReply) {
    var quickReplyPayload = quickReply.payload;
    console.log("Quick reply for message %s with payload %s",
      messageId, quickReplyPayload);

    processPostback(quickReplyPayload, senderID, senderName, timeOfMessage);
    // sendTextMessage(senderID, "Quick reply tapped");
    return;
  }

  if (messageText) {

        needle.get('https://graph.facebook.com/v2.6/'+senderID+'?access_token='+PAGE_ACCESS_TOKEN, function(error, response) {  
        var name = response.body.first_name+" "+response.body.last_name;
        var day=dateFormat("yyyy-mm-dd h:MM:ss");

          connection.query("SELECT * FROM patsy_users WHERE MessengerId = '"+senderID+"'", function(err, rows, fields){
          if (err) throw err;
            for (var i = 0; i < rows.length; i++) {      

              if(rows[i].State !== 'OK'){

                var request = require("request");

                request({
                  uri: "https://jane-assistant.herokuapp.com/palm_inquiries",
                  method: "POST",
                  form: {
                    mobile: "639051193637",
                    company: "Sangkap",
                    name: response.body.first_name,
                    link: "m.me/sangkapph"
                  }
                }, function(error, response, body) {
                  console.log(body);
                });

                var messageData = {
                  recipient: {
                    id: senderID
                  },
                  message: {
                    text: "Hi "+response.body.first_name+", thank you for your message. We will get back to you shortly! :)\n\nYou may refer also from the menu below:",
                    quick_replies: [
                      {
                        content_type:"text",
                        title:"Make a reservation",
                        payload:"RESERVATION"
                      },
                      {
                        content_type:"text",
                        title:"Where you at?",
                        payload:"CONTACT"
                      },
                      {
                        content_type:"text",
                        title:"What's in the Menu",
                        payload:"MENU"
                      },
                      {
                        content_type:"text",
                        title:"Promos",
                        payload:"PROMO"
                      }                      
                    ]
                  }
                };

                callSendAPI(messageData);

                var post2  = {MessengerId: senderID, LastActive: day, State: 'OK'};
                connection.query('UPDATE patsy_users SET ? WHERE MessengerId = ?', [post2, senderID])
                return;

              }

            }

          });

        });
    
  } else if (messageAttachments) {
    console.log(messageAttachments);
    console.log(messageAttachments[0].payload.coordinates);
    if(messageAttachments[0].type == 'location'){

    // sendTextMessage(senderID, "Message with attachment received");
    var locationurl = 'https://maps.googleapis.com/maps/api/geocode/json?latlng='+messageAttachments[0].payload.coordinates.lat+','+messageAttachments[0].payload.coordinates.long+'&key='+GOOGLE_KEY;
    console.log(locationurl);
    needle.get(locationurl, function(error, response) {
      if (!error && response.statusCode == 200){

        console.log(response.body);
        // var result = JSON.parse(response.body);
        // console.log(result.results);
        var result = response.body.results;
        console.log(result);

        //var text = '';
        var addr = []
        var loc = {
          address: ''
        };
        for(var i = 0; i <result[0].address_components.length; i++){
          if(result[0].address_components[i].types[0] == 'street_number'){
            loc.address = result[0].address_components[i].long_name;
          }
          if(result[0].address_components[i].types[0] == 'route'){
            loc.address = loc.address+" "+result[0].address_components[i].long_name;
          }
        }
        for(var i = 0; i <result[1].address_components.length; i++){
          if(result[1].address_components[i].types[0] == 'neighborhood'){
            loc.address = loc.address+", "+result[1].address_components[i].long_name;
          }
          if(result[1].address_components[i].types[0] == 'sub_locality'){
            loc.address = loc.address+", "+result[1].address_components[i].long_name;
          }
          if(result[1].address_components[i].types[0] == 'locality'){
            loc.address = loc.address+", "+result[1].address_components[i].long_name;
          }
          if(result[1].address_components[i].types[0] == 'administrative_area_level_1'){
            loc.address = loc.address+", "+result[1].address_components[i].long_name;
          }
          if(result[1].address_components[i].types[0] == 'country'){
            loc.address = loc.address+", "+result[1].address_components[i].long_name;
          }
        }

        connection.query('SELECT id, name, address, (6371 * acos(cos(radians("'+messageAttachments[0].payload.coordinates.lat+'")) * cos(radians(lat)) * cos(radians(lng) - radians("'+messageAttachments[0].payload.coordinates.long+'")) + sin(radians("'+messageAttachments[0].payload.coordinates.lat+'")) * sin(radians(lat )))) AS distance FROM markers WHERE Tag = "SANGKAP" HAVING distance < 25 ORDER BY distance LIMIT 1;', function(err, rows, fields){
        if (err) throw err;
          for (var i = 0; i < rows.length; i++) {

          var text = 'Nearest branch: '+rows[i].name+'\nAddress: '+rows[i].address+'\nDistance: '+rows[i].distance.toFixed(1)+' km';
          sendTextMessage(senderID, text);

          }
        });     

      }
        
    });

    }

  }

}

/*
 * Delivery Confirmation Event
 *
 * This event is sent to confirm the delivery of a message. Read more about 
 * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-delivered
 *
 */
function receivedDeliveryConfirmation(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var delivery = event.delivery;
  var messageIDs = delivery.mids;
  var watermark = delivery.watermark;
  var sequenceNumber = delivery.seq;
  var day=dateFormat("yyyy-mm-dd h:MM:ss");
  var user = {DeliveredDate: day, Watermark: watermark};

  if (messageIDs) {
    messageIDs.forEach(function(messageID) {
      console.log("Received delivery confirmation for message ID: %s",
        messageID);
      var query = connection.query("UPDATE patsy_messages SET ? WHERE MessageId = '"+messageID+"'", user, function(err, result) {
        if(err) throw err;
      });
    });
  }
  console.log("All message before %d were delivered.", watermark);
}


function generateText(senderID, text){
  var messageData = {
    recipient: {
      id: senderID
    },
    message: {
      text: text,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };
  return messageData;
}


function generateMenu(senderID){
  var messageData = {
    recipient: {
      id: senderID
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: []
        }
      }
    }
  };

  for(var i = 0; i < GlobalMenu.category.length; i++){
    var temp_menu = {
      title:      GlobalMenu.category[i].title,
      image_url:  SERVER_URL + GlobalMenu.category[i].imageurl,
      buttons: [{
        type:     "postback",
        title:    "Show Items",
        payload:  "MENU_"+GlobalMenu.category[i].payload 
      }]
    };
    messageData.message.attachment.payload.elements.push(temp_menu);
  }

  return messageData;
}

function generateItem(senderID, category){
  var messageData = {
    recipient: {
      id: senderID
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: []
        }
      }
    }
  };

  for(var i = 0; i < GlobalMenu.category.length; i++){
    if(GlobalMenu.category[i].payload == category){
      for(var j = 0; j < GlobalMenu.category[i].item.length; j++){
        // var temp_item_title;
        var temp_item_choice;
        var temp_item_payload;
        if(GlobalMenu.category[i].item[j].variant.length == 1){
          temp_item_choice = "Add to Cart (P"+GlobalMenu.category[i].item[j].variant[0].price+")";
          temp_item_payload = "MENU_"+GlobalMenu.category[i].item[j].variant[0].payload+"_ADD";
        }
        else if(GlobalMenu.category[i].item[j].variant.length > 1){
          temp_item_choice = "Select Variant";
          temp_item_payload = "MENU_"+GlobalMenu.category[i].item[j].payload;
        }
        else{
          temp_item_choice = "No Choice";
        }
        console.log(SERVER_URL + GlobalMenu.category[i].item[j].imageurl);
        var temp_item = {
          title:      GlobalMenu.category[i].item[j].title,
          subtitle:   GlobalMenu.category[i].item[j].description,
          image_url:  SERVER_URL + GlobalMenu.category[i].item[j].imageurl,
          buttons: [{
            type:     "postback",
            title:    temp_item_choice,
            payload:  temp_item_payload
          }, {
            type:     "postback",
            title:    "Back to categories",
            payload:  "MAIN_VIEWMENU"
          }, {
            type:     "postback",
            title:    "Share",
            payload:  "MAIN_VIEWMENU"
          }]
        };
        console.log(temp_item);
        messageData.message.attachment.payload.elements.push(temp_item);
      }
    }
  }

  return messageData;
}

function generateVariant(senderID, category, item){
  var messageData = {
    recipient: {
      id: senderID
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: []
        }
      }
    }
  };

  for(var i = 0; i < GlobalMenu.category.length; i++){
    if(GlobalMenu.category[i].payload == category){
      for(var j = 0; j < GlobalMenu.category[i].item.length; j++){
        if(GlobalMenu.category[i].item[j].tag == item){
          for(var k = 0; k < GlobalMenu.category[i].item[j].variant.length; k++){

            if(GlobalMenu.category[i].item[j].variant[k] != ''){
              var title = GlobalMenu.category[i].item[j].variant[k].title + "\u000A"+GlobalMenu.category[i].item[j].variant[k].description;
            }
            else{
              var title = GlobalMenu.category[i].item[j].variant[k].title;
            }

            title = "asd\u000Aqwe";

            var temp_variant = {
              title:      GlobalMenu.category[i].item[j].variant[k].title,
              // image_url:  SERVER_URL + "/assets/rift.png",
              buttons: [{
                type:     "postback",
                title:    "Add to Cart(P"+GlobalMenu.category[i].item[j].variant[k].price+")",
                payload:  "MENU_"+GlobalMenu.category[i].item[j].variant[k].payload+"_ADD"
              }, {
                type:     "postback",
                title:    "Back to meals",
                payload:  "MENU_"+category
              }]
            };
            messageData.message.attachment.payload.elements.push(temp_variant);
          }
        }
      }
    }
  }

  return messageData;
}

function generateQuantity(senderID, item_name, tag, action){
  var text;
  text = "How many items of "+item_name+" do you want?";

  var messageData = {
    recipient: {
      id: senderID
    },
    message: {
      text: text,
      quick_replies: []
    }
  };

  for(var i = 1; i <= 6; i++){
    var temp_quantity = {
      content_type:   "text",
      title:          i,
      payload:        tag+"_"+i 
    };
    messageData.message.quick_replies.push(temp_quantity);
  }

  return messageData;
}

function generateNextChoice(senderID){
  var text = "Would you like to continue shopping?";

  var messageData = {
    recipient: {
      id: senderID
    },
    message: {
      text: text,
      quick_replies: [{
        content_type:   "text",
        title:          "Yes, continue",
        payload:        "MAIN_VIEWMENU"
      }, {
        content_type:   "text",
        title:          "Place Order",
        payload:        "MAIN_PLACEORDER"
      }, {
        content_type:   "text",
        title:          "Show Cart",
        payload:        "MAIN_SHOWCART"
      }]
    }
  };

  return messageData;
}

function generateCart(senderID, cart){
  console.log("generate Cart");
  if(cart.length == 0){
    var messageData = generateText(senderID, "Cart is Empty.");
  }
  else{
    var messageData = {
      recipient: {
        id: senderID
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: []
          }
        }
      }
    };

    for(var i = 0; i < cart.length; i++){
      var temp_cart = {
        title:      cart[i].OrderTitle,
        subtitle:   "Quantity: "+cart[i].OrderQuantity+"\u000AUnit Price: P"+cart[i].UnitPrice+"\u000ATotal Price: P"+cart[i].TotalPrice,
        image_url:  SERVER_URL+cart[i].OrderImageUrl,
        buttons: [{
          type:     "postback",
          title:    "Place Order",
          payload:  "MAIN_PLACEORDER"
        }, {
          type:     "postback",
          title:    "Change Quantity",
          payload:  "MENU_"+cart[i].OrderTag+"_CHANGE"
        }, {
          type:     "postback",
          title:    "Remove from cart",
          payload:  "MENU_"+cart[i].OrderTag+"_DELETE"
        }]
      };
      messageData.message.attachment.payload.elements.push(temp_cart);
    }
  }
    

  return messageData;
}

function generateReceipt(senderID, cart, address){
  var messageData = {
    recipient: {
      id: senderID
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type:  "receipt",
          recipient_name: "Randy",
          order_number:   senderID,
          currency:       "PHP", 
          payment_method: "Cash on Delivery",
          timestamp:      Math.floor(Date.now()/1000)+57600
        }
      }
    }
  };

  messageData.message.attachment.payload.elements = [];

  var total = 0;
  for(var i = 0; i < cart.length; i++){
    var element = {
      title:      cart[i].OrderTitle,
      subtitle:   "Unit Price: P"+cart[i].UnitPrice,
      quantity:   cart[i].OrderQuantity,
      price:      cart[i].TotalPrice,
      currency:   "PHP",
      image_url:  SERVER_URL + cart[i].OrderImageUrl
    };
    messageData.message.attachment.payload.elements.push(element);
    total += parseFloat(cart[i].TotalPrice);
  }

  messageData.message.attachment.payload.summary = {
    subtotal: total*0.88,
    // total_tax: total*0.12,
    total_cost: total
  };

  messageData.message.attachment.payload.adjustments = [{
    name: "VAT",
    amount: total*0.12
  }];

  return messageData;
}


function generateLocation(senderID){
  console.log('location');
 
  var text;
  text = "Location:";

  var messageData = {
    recipient: {
      id: senderID
    },
    message: {
      text: text,
      quick_replies: [{
        "content_type":"location",
      }]
    }
  };

  return messageData;
}


function processPostback(payload, senderID, senderName, timeOfPostback){
  timeOfPostback = Math.floor(timeOfPostback/1000);
  console.log("\nPOSTBACK PAYLOAD: "+payload+" SenderID: "+senderID+" Sender Name: "+senderName+"\n");
  var payload_tag = payload.split('_');
  if(payload == 'GET_STARTED'){
    needle.get('https://graph.facebook.com/v2.6/'+senderID+'?access_token='+PAGE_ACCESS_TOKEN, function(error, response) {  
    var name = response.body.first_name+" "+response.body.last_name;
    var fname = response.body.first_name;
    var lname = response.body.last_name;
    var day=dateFormat("yyyy-mm-dd h:MM:ss");
    var post  = {BotTag: "SANGKAP", MessengerId: senderID, Fname: fname, Lname: lname, LastActive: day, LastClicked: "GET_STARTED", State: ""};

    connection.query("SELECT 1 FROM patsy_users WHERE MessengerId = '"+senderID+"'", function (error, results, fields) {
    if (error) {
        console.log(error);
    }
    if (results.length  > 0) {
        console.log('fail');
        console.log("fail user already exists"+"\r\n");
        var query = connection.query("UPDATE patsy_users SET ? WHERE MessengerId = '"+senderID+"'", post, function(err, result) {
           
        });
        console.log(query.sql);
    } else {
        console.log('insert');
        var query = connection.query('INSERT INTO patsy_users SET ?', post, function(err, result) {
               
        });
        console.log(query.sql);
        console.log("success"+"\r\n");
    }
    console.log(results);
    });

      setTimeout(function(){ 

        var messageData1 = {
          recipient: {
            id: senderID
          },
          message: {
            attachment: {
              type: "image",
              payload: {
                url: SERVER_URL + "/assets/sangkap_opening.jpg"
              }
            }
          }
        };

        callSendAPI(messageData1);

      }, 100);

      setTimeout(function(){ 

      var text = "Hi "+response.body.first_name+", kami sila Sam YG and Slick Rick! Maraming salamat sa pagpili sa Sangkap! Paano kami makakatulong? Mamili sa mga options below : )";
      sendTextMessage(senderID, text);

      }, 1000);

      setTimeout(function(){ 

          var messageData = {
            recipient: {
              id: senderID
            },
            message: {
              attachment: {
                type: "template",
                payload: {
                  template_type: "generic",
                  elements: [{
                    title: "What are your best sellers?",
                    subtitle: "Cebu Lechon Sinigang, Binagoongang Bagnet and Ivatan Kilawin. Give it a try!",               
                    image_url: SERVER_URL + "/assets/best_sellers.png",
                    buttons: [{
                      type: "postback",
                      title: "Learn More",
                      payload: "BESTSELLERS",
                    }],
                  }, {
                    title: "Fiesta Packs",              
                    image_url: SERVER_URL + "/assets/fiesta_packs/fiesta_packs.jpg",
                    buttons: [{
                      type: "postback",
                      title: "Check it out",
                      payload: "PASKO_PACKS",
                    }],
                  }, {
                    title: "Catering",               
                    image_url: SERVER_URL + "/assets/catering.png",
                    buttons: [{
                      type: "postback",
                      title: "Learn More",
                      payload: "CATERING",
                    }],
                  }, {
                    title: "FAQ",              
                    image_url: SERVER_URL + "/assets/faq.jpg",
                    buttons: [{
                      type: "postback",
                      title: "FAQ",
                      payload: "FAQ",
                    }],
                  }, {
                    title: "Promo Announcement",
                    subtitle: "Check out our promos today",     
                    image_url: SERVER_URL + "/assets/promo.jpg",
                    buttons: [{
                      type: "postback",
                      title: "Check Promos",
                      payload: "PROMO",
                    }]
                  }, {
                    title: "Send Location",
                    subtitle: "Suggest branch near you",     
                    image_url: SERVER_URL + "/assets/send_location.jpg",
                    buttons: [{
                      type: "postback",
                      title: "Send Now",
                      payload: "SEND_NOW",
                    }]
                  }, {
                    title: "Reservation",              
                    image_url: SERVER_URL + "/assets/reserve_now.jpg",
                    buttons: [{
                      type: "web_url",
                      url: "https://sangkap-webview.herokuapp.com/index.php?mid="+senderID+'&fname='+fname+'&lname='+lname,
                      title: "Make a reservation",
                      webview_height_ratio: "tall",
                      messenger_extensions: true
                    }]
                  }]
                }
              }
            }
          };  

          callSendAPI(messageData);

      }, 2000);

    });  

  }

  //REF PROMO RESERVATION (ADDED 02/04/18)

  else if(payload == 'RESERVE'){

    needle.get('https://graph.facebook.com/v2.6/'+senderID+'?access_token='+PAGE_ACCESS_TOKEN, function(error, response) {  

        var messageData1 = {
          recipient: {
            id: senderID
          },
          message: {
            attachment: {
              type: "image",
              payload: {
                url: SERVER_URL + "/assets/sangkap_promo2.jpg"
              }
            }
          }
        };

        callSendAPI(messageData1);

          setTimeout(function(){ 
    
                var messageData = {
                  recipient: {
                    id: senderID
                  },
                  message: {
                    text: "Hi "+response.body.first_name+"! Cebu Lechon Sinigang ALL YOU CAN for only 450 pesos.\nReserve Now! :)",
                    quick_replies: [
                      {
                        content_type:"text",
                        title:"Make a reservation",
                        payload:"RESERVATION"
                      },
                      {
                        content_type:"text",
                        title:"Where you at?",
                        payload:"CONTACT"
                      },
                      {
                        content_type:"text",
                        title:"What's in the Menu",
                        payload:"MENU"
                      },
                      {
                        content_type:"text",
                        title:"Promos",
                        payload:"PROMO"
                      }                      
                    ]
                  }
                };

                callSendAPI(messageData);

          }, 1200);                

    });

  }

  else if(payload == 'SEND_NOW'){

    var post = {State: '', LastClicked: 'SEND_LOCATION'};    
    connection.query('UPDATE patsy_users SET ? WHERE MessengerId = ?', [post, senderID])

    var buttons = [];
    var position = 0;

    var messageData = generateLocation(senderID);
    buttons.push(messageData);
    position++;

    callSendAPI2(buttons, 0);

  }    

  else if(payload == 'PASKO_PACKS'){

    var post = {State: '', LastClicked: 'FIESTA_PACKS'};
    connection.query('UPDATE patsy_users SET ? WHERE MessengerId = ?', [post, senderID])

    var messageData = {
      recipient: {
        id: senderID
      },
      message: {
        text: "Handa ka na bang pasarapin ang inyong parties and celebrations?",
        quick_replies: [
          {
            content_type:"text",
            title:"Oo naman!",
            payload:"PACKS"
          },
          {
            content_type:"text",
            title:"Iba pang menu",
            payload:"MENU"
          }
        ]
      }
    };

    callSendAPI(messageData);

  }

  else if(payload == 'PACKS'){

    var post = {State: '', LastClicked: 'FIESTA_PACKS'};    
    connection.query('UPDATE patsy_users SET ? WHERE MessengerId = ?', [post, senderID])

      var messageData = {
        recipient: {
          id: senderID
        },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: []
            }
          }
        }
      };  

      connection.query('SELECT * FROM sangkap_fiesta_packs WHERE id BETWEEN 1 AND 10', function(err, rows, fields){
      if (err) throw err;
      for (var i = 0; i < rows.length; i++) {      

        var temp_menu = {
          title:      rows[i].Title,
          subtitle: rows[i].Subtitle,
          image_url: SERVER_URL + rows[i].ImgDir,
          buttons: [{
            type: "postback",
            title: rows[i].ButtonName1,
            payload: "VIEW_"+rows[i].ButtonPayload1,
          },{
            type: "postback",
            title: rows[i].ButtonName2,
            payload: rows[i].ButtonPayload2,
          }]
        };

        messageData.message.attachment.payload.elements.push(temp_menu);    

      }
     
          callSendAPI(messageData);  

      });

  }

  else if(payload == 'VIEW_PACKS2'){

    var post = {State: '', LastClicked: 'FIESTA_PACKS'};    
    connection.query('UPDATE patsy_users SET ? WHERE MessengerId = ?', [post, senderID])

      var messageData = {
        recipient: {
          id: senderID
        },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: []
            }
          }
        }
      };  

      connection.query('SELECT * FROM sangkap_fiesta_packs WHERE id BETWEEN 11 AND 20', function(err, rows, fields){
      if (err) throw err;
      for (var i = 0; i < rows.length; i++) {      

        var temp_menu = {
          title:      rows[i].Title,
          subtitle: rows[i].Subtitle,
          image_url: SERVER_URL + rows[i].ImgDir,
          buttons: [{
            type: "postback",
            title: rows[i].ButtonName1,
            payload: "VIEW_"+rows[i].ButtonPayload1,
          },{
            type: "postback",
            title: rows[i].ButtonName2,
            payload: rows[i].ButtonPayload2,
          }]
        };

        messageData.message.attachment.payload.elements.push(temp_menu);    

      }
     
          callSendAPI(messageData);  

      });

  }

  else if(payload_tag[0] == 'VIEW'){

    var post = {State: '', LastClicked: 'VIEW'};    
    connection.query('UPDATE patsy_users SET ? WHERE MessengerId = ?', [post, senderID])

    connection.query('SELECT * FROM sangkap_images', function(err, rows, fields){
    
      for (var i = 0; i < rows.length; i++) {  

        if(payload_tag[1] == rows[i].Payload){

          var messageData = {
            recipient: {
              id: senderID
            },
            message: {
              attachment: {
                type: "image",
                payload: {
                  url: SERVER_URL + rows[i].ImgDir
                }
              }
            }
          };

          callSendAPI(messageData);

        }

      }

    });

  }

  else if(payload == 'FAQ'){

    var post = {State: '', LastClicked: 'FAQ'};    
    connection.query('UPDATE patsy_users SET ? WHERE MessengerId = ?', [post, senderID])

      var messageData = {
        recipient: {
          id: senderID
        },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: [{
                title: "Where are you located?",
                subtitle: "We're located at Portico by Alveo, Captain Javier St. Pasig City. Please see map or you may also check us on Waze!",               
                image_url: SERVER_URL + "/assets/map_symbol2.jpg",
                buttons: [{
                  type: "postback",
                  title: "See our contact",
                  payload: "CONTACT",
                }]
              }, {
                title: "What time are you open?",
                subtitle: "Sunday to Thursday: 11 AM - 2 PM and 5 PM - 10 PM, Friday to Saturday: 11 AM - 2 PM and 5 PM - 11 PM",               
                image_url: SERVER_URL + "/assets/open_hours.jpg",
                buttons: [{
                  type: "postback",
                  title: "See open hours",
                  payload: "OPENING",
                }]
              }, {
                title: "Can you send me your menu?",
                subtitle: "Click to see our menu",               
                image_url: SERVER_URL + "/assets/menu0.jpg",
                buttons: [{
                  type: "postback",
                  title: "See our Menu",
                  payload: "MENU",
                }]
              }, {
                title: "Do you serve alcohol?",
                subtitle: "Click to see our drinks",               
                image_url: SERVER_URL + "/assets/inumin.jpg",
                buttons: [{
                  type: "postback",
                  title: "See our Drinks",
                  payload: "DRINKS",
                }]
              }/*, {
                title: "Do you host events?",
                subtitle: "Click to see venue and buffet packages",               
                image_url: SERVER_URL + "/assets/events.jpg",
                buttons: [{
                  type: "postback",
                  title: "View our Event Packages",
                  payload: "EVENTS",
                }]
              }*/]
            }
          }
        }
      };  

      callSendAPI(messageData);

  } 

  else if(payload == 'PROMO'){

    var post = {State: '', LastClicked: 'PROMO'};    
    connection.query('UPDATE patsy_users SET ? WHERE MessengerId = ?', [post, senderID])

        var messageData = {
          recipient: {
            id: senderID
          },
          message: {
            attachment: {
              type: "image",
              payload: {
                url: SERVER_URL + "/assets/menu/Graduation_Salo-salo.jpg"
              }
            }
          }
        };

        callSendAPI(messageData);

        var messageData = {
          recipient: {
            id: senderID
          },
          message: {
            attachment: {
              type: "image",
              payload: {
                url: SERVER_URL + "/assets/menu/Promo_1.jpg"
              }
            }
          }
        };

        callSendAPI(messageData);

        var messageData = {
          recipient: {
            id: senderID
          },
          message: {
            attachment: {
              type: "image",
              payload: {
                url: SERVER_URL + "/assets/menu/Promo_2.jpg"
              }
            }
          }
        };

        callSendAPI(messageData);

        var messageData = {
          recipient: {
            id: senderID
          },
          message: {
            attachment: {
              type: "image",
              payload: {
                url: SERVER_URL + "/assets/menu/Promo_3.jpg"
              }
            }
          }
        };

        callSendAPI(messageData);    

        var messageData = {
          recipient: {
            id: senderID
          },
          message: {
            attachment: {
              type: "image",
              payload: {
                url: SERVER_URL + "/assets/menu/Promo_4.jpg"
              }
            }
          }
        };

        callSendAPI(messageData);            

  }

  // FAQ > Best Sellers
  else if(payload == 'BESTSELLERS'){

    var post = {State: '', LastClicked: 'BESTSELLERS'};    
    connection.query('UPDATE patsy_users SET ? WHERE MessengerId = ?', [post, senderID])

      var messageData = {
        recipient: {
          id: senderID
        },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: [{
                title: "LUZON",
                image_url: SERVER_URL + "/assets/luzon.jpg",
                buttons: [{
                  type: "postback",
                  title: "SHOW BESTSELLERS",
                  payload: "LUZON",
                },{
                  type: "postback",
                  title: "VIEW FULL MENU",
                  payload: "MENU",
                }],
              },{
                title: "VISAYAS",
                image_url: SERVER_URL + "/assets/visayas.jpg",
                buttons: [{
                  type: "postback",
                  title: "SHOW BESTSELLERS",
                  payload: "VISAYAS",
                },{
                  type: "postback",
                  title: "VIEW FULL MENU",
                  payload: "MENU",
                }],
              },{
                title: "MINDANAO",
                image_url: SERVER_URL + "/assets/mindanao.jpg",
                buttons: [{
                  type: "postback",
                  title: "SHOW BESTSELLERS",
                  payload: "MINDANAO",
                },{
                  type: "postback",
                  title: "VIEW FULL MENU",
                  payload: "MENU",
                }],
              }]
            }
          }
        }
      };  

      callSendAPI(messageData);

  }

  else if(payload == 'CATERING'){

    var post = {State: '', LastClicked: 'CATERING'};    
    connection.query('UPDATE patsy_users SET ? WHERE MessengerId = ?', [post, senderID])

      var messageData = {
        recipient: {
          id: senderID
        },
        message: {
          attachment: {
            type: "image",
            payload: {
              url: SERVER_URL + "/assets/catering_contact.jpg"
            }
          }
        }
      };

      callSendAPI(messageData);

      setTimeout(function(){ 

        var messageData = {
          recipient: {
            id: senderID
          },
          message: {
            text: "Show Full or In-house catering menu.",
            quick_replies: [
              {
                content_type:"text",
                title:"Full Catering",
                payload:"FULL_CATERING"
              },
              {
                content_type:"text",
                title:"In-house Catering",
                payload:"INHOUSE_CATERING"
              }
            ]
          }
        };

        callSendAPI(messageData);

      }, 3000);        

  }

  else if(payload == 'FULL_CATERING'){

    var post = {State: '', LastClicked: 'FULL_CATERING'};    
    connection.query('UPDATE patsy_users SET ? WHERE MessengerId = ?', [post, senderID])


      var messageData = {
        recipient: {
          id: senderID
        },
        message: {
          attachment: {
            type: "image",
            payload: {
              url: SERVER_URL + "/assets/full.jpg"
            }
          }
        }
      };

      callSendAPI(messageData);

    setTimeout(function(){ 

      sendTypingOn(senderID);

    }, 3000);            

    setTimeout(function(){ 

      var messageData = {

        recipient:{
          id: senderID
        },
        message:{
          attachment:{
            type:"template",
            payload:{
              template_type:"button",
              text:"To inquire more about catering just click the button below",
              buttons:[
                {
                  type: "web_url",
                  url: "https://www.facebook.com/Sangkap-Catering-145992622779614",
                  title: "Inquire Now",
                  webview_height_ratio: "tall",
                  messenger_extensions: false
                }
              ]
            }
          }
        }

      };  

      callSendAPI(messageData);

    }, 5000);        

  }

  else if(payload == 'INHOUSE_CATERING'){

    var post = {State: '', LastClicked: 'INHOUSE_CATERING'};    
    connection.query('UPDATE patsy_users SET ? WHERE MessengerId = ?', [post, senderID])

    var messageData = {
      recipient: {
        id: senderID
      },
      message: {
        attachment: {
          type: "image",
          payload: {
            url: SERVER_URL + "/assets/inhouse.jpg"
          }
        }
      }
    };

    callSendAPI(messageData);

    setTimeout(function(){ 

      sendTypingOn(senderID);

    }, 3000);            

    setTimeout(function(){ 

      var messageData = {

        recipient:{
          id: senderID
        },
        message:{
          attachment:{
            type:"template",
            payload:{
              template_type:"button",
              text:"To inquire more about catering just click the button below",
              buttons:[
                {
                  type: "web_url",
                  url: "https://www.facebook.com/Sangkap-Catering-145992622779614",
                  title: "Inquire Now",
                  webview_height_ratio: "tall",
                  messenger_extensions: false
                }
              ]
            }
          }
        }

      };  

      callSendAPI(messageData);

    }, 5000);        

  }  

  else if(payload == 'LUZON'){

    var post = {State: '', LastClicked: 'LUZON'};    
    connection.query('UPDATE patsy_users SET ? WHERE MessengerId = ?', [post, senderID])

    var text = "Luzon’s best seller";
    sendTextMessage(senderID, text);
    sendTypingOn(senderID);

      var messageData = {
        recipient: {
          id: senderID
        },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: [{
                title: "Ivatan Kilawin",
                image_url: SERVER_URL + "/assets/menu/Ivatan_Kilawin.jpeg",
                buttons: [{
                  type: "postback",
                  title: "SHOW MORE",
                  payload: "KILAWIN",
                },{
                  type: "postback",
                  title: "VIEW FULL MENU",
                  payload: "MENU",
                }],
              }]
            }
          }
        }
      };  

      callSendAPI(messageData);

  }

  // FAQ > Best Sellers > Show More

  else if(payload == 'KILAWIN'){

    var post = {State: '', LastClicked: 'KILAWIN'};    
    connection.query('UPDATE patsy_users SET ? WHERE MessengerId = ?', [post, senderID])

    var messageData = {
      recipient: {
        id: senderID
      },
      message: {
        attachment: {
          type: "image",
          payload: {
            url: SERVER_URL + "/assets/menu/IVATANKILAWIN2.jpg"
          }
        }
      }
    };

    callSendAPI(messageData);

    var messageData = {
      recipient: {
        id: senderID
      },
      message: {
        attachment: {
          type: "image",
          payload: {
            url: SERVER_URL + "/assets/menu/IVATANKILAWIN3.jpg"
          }
        }
      }
    };

    callSendAPI(messageData);

  }

  else if(payload == 'VISAYAS'){

    var post = {State: '', LastClicked: 'VISAYAS'};    
    connection.query('UPDATE patsy_users SET ? WHERE MessengerId = ?', [post, senderID])

    var text = "Visayas's best seller";
    sendTextMessage(senderID, text);
    sendTypingOn(senderID);

      var messageData = {
        recipient: {
          id: senderID
        },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: [{
                title: "Cebu Lechon Sinigang",
                image_url: SERVER_URL + "/assets/menu/Cebu_Lechon_Sinigang.jpg",
                buttons: [{
                  type: "postback",
                  title: "SHOW MORE",
                  payload: "LECHON_SINIGANG",
                },{
                  type: "postback",
                  title: "VIEW FULL MENU",
                  payload: "MENU",
                }],
              }]
            }
          }
        }
      };  

      callSendAPI(messageData);

  }  

  else if(payload == 'LECHON_SINIGANG'){

    var post = {State: '', LastClicked: 'LECHON_SINIGANG'};    
    connection.query('UPDATE patsy_users SET ? WHERE MessengerId = ?', [post, senderID])

    var messageData = {
      recipient: {
        id: senderID
      },
      message: {
        attachment: {
          type: "image",
          payload: {
            url: SERVER_URL + "/assets/menu/SINIGANG41.jpg"
          }
        }
      }
    };

    callSendAPI(messageData);

    var messageData = {
      recipient: {
        id: senderID
      },
      message: {
        attachment: {
          type: "image",
          payload: {
            url: SERVER_URL + "/assets/menu/SINIGANG42.jpg"
          }
        }
      }
    };

    callSendAPI(messageData);

    var messageData = {
      recipient: {
        id: senderID
      },
      message: {
        attachment: {
          type: "image",
          payload: {
            url: SERVER_URL + "/assets/menu/SINIGANG43.jpg"
          }
        }
      }
    };

    callSendAPI(messageData);

  } 

  else if(payload == 'MINDANAO'){

    var post = {State: '', LastClicked: 'MINDANAO'};    
    connection.query('UPDATE patsy_users SET ? WHERE MessengerId = ?', [post, senderID])

    var text = "Mindanao's best seller";
    sendTextMessage(senderID, text);
    sendTypingOn(senderID);

      var messageData = {
        recipient: {
          id: senderID
        },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: [{
                title: "Inasal sa Gata",
                image_url: SERVER_URL + "/assets/menu/Zamboanga_Adobong_Gata.jpeg",
                buttons: [{
                  type: "postback",
                  title: "SHOW MORE",
                  payload: "INASAL_SA_GATA",
                },{
                  type: "postback",
                  title: "VIEW FULL MENU",
                  payload: "MENU",
                }],
              }]
            }
          }
        }
      };  

      callSendAPI(messageData);

  }

  else if(payload == 'INASAL_SA_GATA'){

    var post = {State: '', LastClicked: 'INASAL_SA_GATA'};    
    connection.query('UPDATE patsy_users SET ? WHERE MessengerId = ?', [post, senderID])

    var messageData = {
      recipient: {
        id: senderID
      },
      message: {
        attachment: {
          type: "image",
          payload: {
            url: SERVER_URL + "/assets/menu/inasal_sa_gata.jpg"
          }
        }
      }
    };

    callSendAPI(messageData);

  }

  else if(payload == 'RESERVATION'){
 
     needle.get('https://graph.facebook.com/v2.6/'+senderID+'?access_token='+PAGE_ACCESS_TOKEN, function(error, response) {  
     var fname = response.body.first_name;
     var lname = response.body.last_name;

    var post = {State: '', LastClicked: 'RESERVATION'};    
    connection.query('UPDATE patsy_users SET ? WHERE MessengerId = ?', [post, senderID])


     var messageData = {

      recipient:{
        id: senderID
      },
      message:{
        attachment:{
          type:"template",
          payload:{
            template_type:"button",
            text:"Hi!, Please click the button below to make reservation",
            buttons:[
              {
                type: "web_url",
                url: "https://sangkap-webview.herokuapp.com/index.php?mid="+senderID+'&fname='+fname+'&lname='+lname,
                title: "Make a reservation",
                webview_height_ratio: "tall",
                messenger_extensions: true
              }
            ]
          }
        }
      }

    };  

      callSendAPI(messageData);

    });

  }

  // FAQ > Contact
  else if(payload == 'CONTACT'){

    var post = {State: '', LastClicked: 'CONTACT'};    
    connection.query('UPDATE patsy_users SET ? WHERE MessengerId = ?', [post, senderID])

    var text = "We're located at Portico by Alveo, Captain Javier St. Pasig City and we also have a branch at Vista Mall, Taguig. Please see map or you may also check us on Waze!\n\nCheck our newest branch at Vertis Mall, Quezon City";
    sendTextMessage(senderID, text);

    var messageData = {
      recipient: {
        id: senderID
      },
      message: {
        attachment: {
          type: "image",
          payload: {
            url: SERVER_URL + "/assets/Sangkap_Map.jpg"
          }
        }
      }
    };

    callSendAPI(messageData);

  }
  // FAQ > Opening
  else if(payload == 'OPENING'){

    var post = {State: '', LastClicked: 'OPENING'};    
    connection.query('UPDATE patsy_users SET ? WHERE MessengerId = ?', [post, senderID])

      var text = "Portico by Alveo (Capt. Javier St., Pasig City)\n\nSunday: 11:00 AM - 2:00 PM and 5:00 PM - 10:00 PM\nMonday: 11:00 AM - 2:00 PM and 5:00 PM - 10:00 PM\nTuesday: 11:00 AM - 2:00 PM and 5:00 PM - 10:00 PM\nWednesday: 11:00 AM - 2:00 PM and 5:00 PM - 10:00 PM\nThursday: 11:00 AM - 2:00 PM and 5:00 PM - 10:00 PM\nFriday: 11:00 AM - 2:00 PM and 5:00 PM - 11:00 PM\nSaturday: 11:00 AM - 2:00 PM and 5:00 PM - 11:00 PM\n\n";
      sendTextMessage(senderID, text);

      var text = "Vista Mall (Cayetano Blvd., Taguig City)\n\nSunday: 10:00 AM- 10:00 PM\nMonday: 10:00 AM - 10:00 PM\nTuesday: 10:00 AM - 10:00 PM\nWednesday: 10:00 AM - 10:00 PM\nThursday: 10:00 AM - 10:00 PM\nFriday: 10:00 AM - 11:00 PM\nSaturday: 10:00 AM - 11:00 PM\n\n";
      sendTextMessage(senderID, text);

      var text = "Ayala Malls Vertis North (North Ave., Quezon City)\n\nSunday: 10:00 AM- 9:00 PM\nMonday: 10:00 AM - 9:00 PM\nTuesday: 10:00 AM - 9:00 PM\nWednesday: 10:00 AM - 9:00 PM\nThursday: 10:00 AM - 9:00 PM\nFriday: 10:00 AM - 9:00 PM\nSaturday: 10:00 AM - 9:00 PM";
      sendTextMessage(senderID, text);

  }

  // FAQ > Menu
  else if(payload == 'MENU'){

    var post = {State: '', LastClicked: 'MENU'};    
    connection.query('UPDATE patsy_users SET ? WHERE MessengerId = ?', [post, senderID])

      connection.query('SELECT * FROM sangkap_images WHERE Payload="MENU"', function(err, rows, fields){
      
        for (var i = 0; i < rows.length; i++) {  

            var messageData = {
              recipient: {
                id: senderID
              },
              message: {
                attachment: {
                  type: "image",
                  payload: {
                    url: SERVER_URL + rows[i].ImgDir
                  }
                }
              }
            };

            callSendAPI(messageData);          

        }

      });  

  } 

  // FAQ > Drinks
  else if(payload == 'DRINKS'){

    var post = {State: '', LastClicked: 'DRINKS'};    
    connection.query('UPDATE patsy_users SET ? WHERE MessengerId = ?', [post, senderID])

    var messageData = {
      recipient: {
        id: senderID
      },
      message: {
        attachment: {
          type: "image",
          payload: {
            url: SERVER_URL + "/assets/menu/FZ_DRINKS_LIST_SANGKAP9_FINAL1.jpg"
          }
        }
      }
    };

    callSendAPI(messageData);


    var messageData = {
      recipient: {
        id: senderID
      },
      message: {
        attachment: {
          type: "image",
          payload: {
            url: SERVER_URL + "/assets/menu/FZ_DRINKS_LIST_SANGKAP9_FINAL2.jpg"
          }
        }
      }
    };

    callSendAPI(messageData);

  } 

  //PROMO
  else if(payload == 'RESERVE'){

    needle.get('https://graph.facebook.com/v2.6/'+senderID+'?access_token='+PAGE_ACCESS_TOKEN, function(error, response) {  
    var fname = response.body.first_name;
    var lname = response.body.last_name;

    var post = {State: '', LastClicked: 'RESERVE'};    
    connection.query('UPDATE patsy_users SET ? WHERE MessengerId = ?', [post, senderID])
      
      setTimeout(function(){ 

        var messageData = {
          recipient: {
            id: senderID
          },
          message: {
            attachment: {
              type: "image",
              payload: {
                url: SERVER_URL + "/assets/OCT_PROMO.jpg"
              }
            }
          }
        };

        callSendAPI(messageData);

      }, 1000);    

      setTimeout(function(){ 

        var messageData = {
          recipient: {
            id: senderID
          },
          message: {
            attachment: {
              type: "template",
              payload: {
                template_type: "button",
                text: "Buy 2 beers and get to choose from our Cebu Chicharon Balat ng Manok, Pateros Sizzling Balut, or Pampanga Chicharon Bulaklak for your FREE pulutan!\n\n\nWould you like to reserve?",
                buttons:[{
                  type: "web_url",
                  url: "https://sangkap-webview.herokuapp.com/index.php?mid="+senderID+'&fname='+fname+'&lname='+lname,
                  title: "Yes",
                  webview_height_ratio: "tall",
                  messenger_extensions: true
                }, {
                  type: "postback",
                  title: "Not yet",
                  payload: "GET_STARTED"
                }]
              }
            }
          }
        };  

        callSendAPI(messageData);

      }, 3000);          

    });

  }


}// End processpostback


function receivedPostback(event) {
  var senderID = event.sender.id;
  var senderName = event.sender.name;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  var payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " + 
    "at %d", senderID, recipientID, payload, timeOfPostback);
  console.log(event);

  // When a postback is called, we'll send a message back to the sender to 
  // let them know it was successful

  processPostback(payload, senderID, senderName, timeOfPostback);

  // sendTextMessage(senderID, "Postback called");
}

/*
 * Message Read Event
 *
 * This event is called when a previously-sent message has been read.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-read
 * 
 */
function receivedMessageRead(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;

  // All messages before watermark (a timestamp) or sequence have been seen.
  var watermark = event.read.watermark;
  var sequenceNumber = event.read.seq;

  console.log("Received message read event for watermark %d and sequence " +
    "number %d", watermark, sequenceNumber);
}

/*
 * Account Link Event
 *
 * This event is called when the Link Account or UnLink Account action has been
 * tapped.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/account-linking
 * 
 */
function receivedAccountLink(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;

  var status = event.account_linking.status;
  var authCode = event.account_linking.authorization_code;

  console.log("Received account link event with for user %d with status %s " +
    "and auth code %s ", senderID, status, authCode);
}

/*
 * Send an image using the Send API.
 *
 */
function sendImageMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: SERVER_URL + "/assets/rift.png"
        }
      }
    }
  };

  callSendAPI(messageData);
}

function sendGifMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: SERVER_URL + "/assets/instagram_logo.gif"
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send audio using the Send API.
 *
 */
function sendAudioMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "audio",
        payload: {
          url: SERVER_URL + "/assets/sample.mp3"
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a video using the Send API.
 *
 */
function sendVideoMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "video",
        payload: {
          url: SERVER_URL + "/assets/allofus480.mov"
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a file using the Send API.
 *
 */
function sendFileMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "file",
        payload: {
          url: SERVER_URL + "/assets/test.txt"
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a button message using the Send API.
 *
 */
function sendButtonMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "This is test text",
          buttons:[{
            type: "web_url",
            url: "https://www.oculus.com/en-us/rift/",
            title: "Open Web URL"
          }, {
            type: "postback",
            title: "Trigger Postback",
            payload: "DEVELOPER_DEFINED_PAYLOAD"
          }, {
            type: "phone_number",
            title: "Call Phone Number",
            payload: "+16505551234"
          }]
        }
      }
    }
  };  

  callSendAPI(messageData);
}

/*
 * Send a Structured Message (Generic Message type) using the Send API.
 *
 */
function sendGenericMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",               
            image_url: SERVER_URL + "/assets/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",               
            image_url: SERVER_URL + "/assets/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }
  };  

  callSendAPI(messageData);
}

/*
 * Send a receipt message using the Send API.
 *
 */
function sendReceiptMessage(recipientId) {
  // Generate a random receipt ID as the API requires a unique ID
  var receiptId = "order" + Math.floor(Math.random()*1000);

  var messageData = {
    recipient: {
      id: recipientId
    },
    message:{
      attachment: {
        type: "template",
        payload: {
          template_type: "receipt",
          recipient_name: "Peter Chang",
          order_number: receiptId,
          currency: "USD",
          payment_method: "Visa 1234",        
          timestamp: "1428444852", 
          elements: [{
            title: "Oculus Rift",
            subtitle: "Includes: headset, sensor, remote",
            quantity: 1,
            price: 599.00,
            currency: "USD",
            image_url: SERVER_URL + "/assets/riftsq.png"
          }, {
            title: "Samsung Gear VR",
            subtitle: "Frost White",
            quantity: 1,
            price: 99.99,
            currency: "USD",
            image_url: SERVER_URL + "/assets/gearvrsq.png"
          }],
          address: {
            street_1: "1 Hacker Way",
            street_2: "",
            city: "Menlo Park",
            postal_code: "94025",
            state: "CA",
            country: "US"
          },
          summary: {
            subtotal: 698.99,
            shipping_cost: 20.00,
            total_tax: 57.67,
            total_cost: 626.66
          },
          adjustments: [{
            name: "New Customer Discount",
            amount: -50
          }, {
            name: "$100 Off Coupon",
            amount: -100
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a message with Quick Reply buttons.
 *
 */
function sendQuickReply(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "What's your favorite movie genre?",
      quick_replies: [
        {
          "content_type":"text",
          "title":"Action",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_ACTION"
        },
        {
          "content_type":"text",
          "title":"Comedy",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_COMEDY"
        },
        {
          "content_type":"text",
          "title":"Drama",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_DRAMA"
        }
      ]
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a read receipt to indicate the message has been read
 *
 */
function sendReadReceipt(recipientId) {
  console.log("Sending a read receipt to mark message as seen");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "mark_seen"
  };

  callSendAPI(messageData);
}

/*
 * Turn typing indicator on
 *
 */
function sendTypingOn(recipientId) {
  console.log("Turning typing indicator on");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_on"
  };

  callSendAPI(messageData);
}

/*
 * Turn typing indicator off
 *
 */
function sendTypingOff(recipientId) {
  console.log("Turning typing indicator off");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_off"
  };

  callSendAPI(messageData);
}

/*
 * Send a message with the account linking call-to-action
 *
 */
function sendAccountLinking(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "Welcome. Link your account.",
          buttons:[{
            type: "account_link",
            url: SERVER_URL + "/authorize"
          }]
        }
      }
    }
  };  

  callSendAPI(messageData);
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll 
 * get the message id in a response 
 *
 */
function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s", 
          messageId, recipientId);
      } else {
      console.log("Successfully called Send API for recipient %s", 
        recipientId);
      }
    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });  
}


function callSendAPI2(messageData, position) {
  console.log(messageData[position]);

  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData[position]

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if(position < messageData.length - 1){
        callSendAPI2(messageData, position+1);
      }

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s", 
          messageId, recipientId);
      } else {
      console.log("Successfully called Send API for recipient %s", 
        recipientId);
      }
    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });  
}

// Start server
// Webhooks must be available via SSL with a certificate signed by a valid 
// certificate authority.
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;

