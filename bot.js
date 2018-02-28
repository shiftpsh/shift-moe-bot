var Twitter = require('twitter');
var gm = require('gm').subClass({ imageMagick: true });
var fs = require('fs');
var request = require('request');

var moment = require('moment-timezone');

var botScreenName = "bot_screen_name";

var client = new Twitter({
    consumer_key: 'consumer_key',
    consumer_secret: 'consumer_secret',
    access_token_key: 'access_token_key',
    access_token_secret: 'access_token_secret'
});

var modules = [];

function init() {
    require("fs").readdirSync(require("path").join(__dirname, "modules")).forEach(function (file) {
        var plugin_module = require("./modules/" + file + "/module.js");
        console.log('Initialized module ' + plugin_module.title + '.');
        modules.push({
            title: plugin_module.title,
            module: plugin_module,
            process: plugin_module.process
        });
    });
}

init();

var stream = null;
var timer = null;
var calm = 1;

function restart() {
    calm = 1;
    clearTimeout(timer);
    if (stream !== null && stream.active) {
        stream.destroy();
    } else {
        initStream();
    }
}

function initStream() {
    clearTimeout(timer);
    if (stream == null || !stream.active) {
        client.stream('statuses/filter', {
            track: "@" + botScreenName
        }, function (stream) {
            clearTimeout(timer);
            stream = stream;
            stream.active = true;
            stream.on('data', function (event) {
                if (!event.retweeted_status) {
                    for (moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
                        modules[moduleIndex].process(client, event);
                    }
        
                    console.log(event && event.user.screen_name);
                } else {
                    console.log(event && (event.user.screen_name + " (RT)"));
                }
            });
            stream.on('error', function (error) {
                if (err.message == 'Status Code: 420') {
                    calm++;
                }
                console.log(error);
            });
            stream.on('end', function () {
                stream.active = false;
                clearTimeout(timer);
                timer = setTimeout(function () {
                    clearTimeout(timer);
                    if (stream.active) {
                        stream.destroy();
                    } else {
                        initStream();
                    }
                }, 1000 * calm * calm);
            });
        });
    }
};

initStream();

function sendTweet(client, text) {
    client.post('statuses/update', {
        status: text
    }, function (error, tweet, response) {
        console.log(error);
        console.log(text);
    });
}

function updateHeader(client) {
    var fileName = 'header_pane.png';
    var font = 'NotoSansCJKkr-Medium.otf';
    var loadedImage;

    request('http://free.currencyconverterapi.com/api/v3/convert?q=USD_KRW&compact=y', function (usd_error, usd_response, usd_body) {
        if (!usd_body) return;
        console.log(usd_body);
        var usd_exchangeData = JSON.parse(usd_body);
        if (Object.keys(usd_exchangeData).length < 1) return;

        var usd_data = usd_exchangeData[Object.keys(usd_exchangeData)[0]];
        var usd_rate = usd_data.val;

        request('http://free.currencyconverterapi.com/api/v3/convert?q=JPY_KRW&compact=y', function (jpy_error, jpy_response, jpy_body) {
            if (!jpy_body) return;
            console.log(jpy_body);
            var jpy_exchangeData = JSON.parse(jpy_body);
            if (Object.keys(jpy_exchangeData).length < 1) return;

            var jpy_data = jpy_exchangeData[Object.keys(jpy_exchangeData)[0]];
            var jpy_rate = jpy_data.val * 100;

            request('https://api.korbit.co.kr/v1/ticker?currency_pair=btc_krw', function (btc_error, btc_response, btc_body) {
                if (!btc_body) return;
                console.log(btc_body);
                var btc_exchangeData = JSON.parse(btc_body);
                if (Object.keys(btc_exchangeData).length < 1) return;
                var btc_rate = parseInt(btc_exchangeData.last);

                gm(fileName)
                    .fill('#FFFFFF')
                    .font(font)
                    .fontSize(60)
                    .drawText(178, 249, usd_rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 'southeast')
                    .fontSize(36)
                    .drawText(178, 194, jpy_rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 'southeast')
                    .drawText(178, 144, btc_rate.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }), 'southeast')
                    .fill('#000000')
                    .fontSize(18)
                    .drawText(1015, 84, moment().tz("Asia/Seoul").format('YYYY-MM-DD, HH:mm') + " KST", 'northwest')
                    .write('temp.png', function (err) {
                        if (err) console.log(err);

                        var data = base64_encode('temp.png');

                        client.post('account/update_profile_banner', {
                            banner: data, width: 1500, height: 421
                        }, function (error, banner, response) {
                            console.log(error);
                        });
                    });
            });
        });
    });
}

function base64_encode(file) {
    var bitmap = fs.readFileSync(file);
    return new Buffer(bitmap).toString('base64');
}

function tryUpdateHeader(client) {
    updateHeader(client);
    setTimeout(function () { tryUpdateHeader(client) }, 1000 * 60 * 60);
}

tryUpdateHeader(client);