exports.title = "auto_xchange";

var botScreenName = "bot_screen_name";

const defaultConfig = {
    output_message: {
        real: "$1 $2$3 현재 $4원입니다.",
        psuedo: "$1 $2 $3 현재 $4원 정도입니다.",
        material: "$1 $2 $3$4 현재 $5원입니ㅏㄷ.",
        krw: "$1 $2$3 $4원입니다."
    },

    default: [
        {
            code: "USD",
            criteria: ["usd", "dollar", "달러", "딸라", "$", "사달라", "사딸라"],
            name: "달러",
            screen: "달러는",
            prefix: "💵",
            psuedo: false,
            endpoint: "fcc"
        },
        {
            code: "JPY",
            criteria: ["jpy", "yen", "엔", "¥", "円"],
            name: "엔",
            screen: "엔은",
            prefix: "💴",
            psuedo: false,
            endpoint: "fcc"
        },
        {
            code: "STAR_JEWEL",
            criteria: ["쥬얼", "주얼", "ジュエル"],
            name: "스타 쥬얼",
            screen: "데레스테 스타 쥬얼은",
            prefix: "🌟",
            psuedo: true,
            original_code: "JPY", 
            calculate: "if (value < 360) { value / 0.5 * 1.1 } else if (value < 760) { value / 0.75 * 1.1 } else if (value < 1300) { value / 0.79 * 1.1 } else if (value < 2650) { value / 0.81 * 1.1 } else if (value < 4200) { value / 0.83 * 1.1 } else if (value < 8400) { value / 0.84 * 1.1 } else { value / 0.86 * 1.1 }",
            endpoint: "fcc"
        }
    ],
};
const configPath = './modules/auto_xchange/config.json';

var config = defaultConfig;
getConfig();

exports.process = function (client, tweet) {
    var text = tweet.text;

    var enabled = true;

    var value = extractNumber(text);
    if (containsAny(text, ["사달라", "사딸라"])) value = 4;
    if (value <= 0) return;

    if (enabled) {
        for (i = 0; i < config.default.length; i++) {
            var currency = config.default[i];
            if (containsAny(text.toLowerCase(), currency.criteria) && !(text.includes("원**입니다"))) {
                var request = require('request');
                var code = currency.code;
                if (currency.psuedo) code = currency.original_code;

                console.log("[xchange] Parsed: @" + tweet.user.screen_name + ": " + text);
                console.log("[xchange] Requesting conversion: " + value + " " + currency.code);

                if (currency.endpoint == "fcc") {
                    if (code != "KRW") {
                        request('http://free.currencyconverterapi.com/api/v3/convert?q=' + code + '_KRW&compact=y', function (error, response, body) {
                            if (body) {
                                console.log(body);
                                var exchangeData = JSON.parse(body);

                                if (Object.keys(exchangeData).length >= 1) {
                                    var data = exchangeData[Object.keys(exchangeData)[0]];
                                    var rate = data.val;

                                    if (!currency.psuedo) {
                                        var message = config.output_message.real;
                                        message = message.replace('$1', currency.prefix);
                                        message = message.replace('$2', (value * 1).toLocaleString());
                                        message = message.replace('$3', currency.screen);
                                        message = message.replace('$4', (Math.round(value * rate)).toLocaleString());

                                        sendReplyTweet(client, tweet, message);
                                    } else {
                                        var message = config.output_message.psuedo;
                                        console.log(currency.calculate.replace(/value/gi, value));

                                        message = message.replace('$1', currency.prefix);
                                        message = message.replace('$2', (value * 1).toLocaleString());
                                        message = message.replace('$3', currency.screen);
                                        message = message.replace('$4', (Math.round(eval(currency.calculate.replace(/value/gi, value)) * rate)).toLocaleString());

                                        sendReplyTweet(client, tweet, message);
                                    }
                                } else {
                                    sendReplyTweet(client, tweet, "현재 환율 시스템에 오류가 있는 것 같아요. @shiftpsh에게 문의해 주세요.");
                                }
                            } else {
                                sendReplyTweet(client, tweet, "현재 환율 시스템에 오류가 있는 것 같아요. @shiftpsh에게 문의해 주세요.");
                            }
                        });
                    } else if (currency.psuedo) {
                        var message = config.output_message.krw;
                        console.log(currency.calculate.replace(/value/gi, value));

                        message = message.replace('$1', currency.prefix);
                        message = message.replace('$2', (value * 1).toLocaleString());
                        message = message.replace('$3', currency.screen);
                        message = message.replace('$4', (Math.round(eval(currency.calculate.replace(/value/gi, value)))).toLocaleString());

                        sendReplyTweet(client, tweet, message);
                    }
                } else if (currency.endpoint == "korbit") {
                    request('https://api.korbit.co.kr/v1/ticker?currency_pair=' + code.toLowerCase() + '_krw', function (error, response, body) {
                        if (body) {
                            console.log(body);
                            var exchangeData = JSON.parse(body);

                            if (Object.keys(exchangeData).length >= 1) {
                                var rate = exchangeData.last;

                                var message = config.output_message.real;
                                message = message.replace('$1', currency.prefix);
                                message = message.replace('$2', (value * 1).toLocaleString(undefined, { maximumFractionDigits: 16 }));
                                message = message.replace('$3', currency.screen);
                                message = message.replace('$4', (Math.round(value * rate)).toLocaleString());

                                sendReplyTweet(client, tweet, message);
                            } else {
                                sendReplyTweet(client, tweet, "현재 환율 시스템에 오류가 있는 것 같아요. @shiftpsh에게 문의해 주세요.");
                            }
                        } else {
                            sendReplyTweet(client, tweet, "현재 환율 시스템에 오류가 있는 것 같아요. @shiftpsh에게 문의해 주세요.");
                        }
                    });
                } else if (currency.endpoint == "fcc_material") {
                    var tr_ounce = 31.1034768;
                    var units = "g";
                    var unit_multiplier = 1;
                    if (containsAny(text, ["mg", "밀리그람", "밀리그램"])) {
                        units = "mg";
                        unit_multiplier = 0.0001;
                    }
                    if (containsAny(text, ["kg", "킬로", "킬로그람", "킬로그램"])) {
                        units = "kg";
                        unit_multiplier = 1000;
                    }

                    if (code != "KRW") {
                        request('http://currencyconverterapi.com/api/v3/convert?q=' + code + '_KRW&compact=y&apiKey=b8b6090a-151f-4c32-af2e-d78adcea72c1', function (error, response, body) {
                            if (body) {
                                console.log(body);
                                var exchangeData = JSON.parse(body);

                                if (Object.keys(exchangeData).length >= 1) {
                                    var data = exchangeData[Object.keys(exchangeData)[0]];
                                    var rate = data.val;

                                    var message = config.output_message.material;
                                    message = message.replace('$1', currency.prefix);
                                    message = message.replace('$2', currency.screen);
                                    message = message.replace('$3', (value * 1).toLocaleString());
                                    message = message.replace('$4', units + "는");
                                    message = message.replace('$5', (Math.round(value * rate * unit_multiplier / tr_ounce)).toLocaleString());

                                    sendReplyTweet(client, tweet, message);
                                } else {
                                    sendReplyTweet(client, tweet, "현재 환율 시스템에 오류가 있는 것 같아요. @shiftpsh에게 문의해 주세요.");
                                }
                            } else {
                                sendReplyTweet(client, tweet, "현재 환율 시스템에 오류가 있는 것 같아요. @shiftpsh에게 문의해 주세요.");
                            }
                        });
                    } else if (currency.psuedo) {
                        var message = config.output_message.krw;
                        console.log(currency.calculate.replace(/value/gi, value));

                        message = message.replace('$1', currency.prefix);
                        message = message.replace('$2', (value * 1).toLocaleString());
                        message = message.replace('$3', currency.screen);
                        message = message.replace('$4', (Math.round(eval(currency.calculate.replace(/value/gi, value)))).toLocaleString());

                        sendReplyTweet(client, tweet, message);
                    }
                }

                break;
            }
        }
    }
}

function containsAny(str, substrings) {
    for (var i = 0; i != substrings.length; i++) {
        var substring = substrings[i];
        if (str.indexOf(substring) != - 1) {
            return true;
        }
    }
    return false;
}

function getConfig() {
    var fs = require('fs');

    fs.open(configPath, 'r', function (err, fd) {
        if (err) {
            fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 4), function (err) {
                if (err) {
                    console.log(err);
                }
                console.log("Made configuration file for modules/auto_xchange.");
            });
        } else {
            fs.readFile(configPath, 'utf8', function (err, data) {
                if (err) {
                    return console.log(err);
                }
                console.log("Got configurations for modules/auto_xchange.");
                try {
                    config = JSON.parse(data);
                } catch (err) {
                    console.log(err);
                }
            });
        }
    });
}

function extractNumber(str) {
    var s = str.replace(/,/g, "").split(' ');
    var i;
    for (i = 0; i < s.length; i++) {
        try {
            if (s[i].match(/[+-]?\d+(\.\d+)?/g).length != 0) {
                return s[i].match(/[+-]?\d+(\.\d+)?/g);
            }
        } catch (e) { }
    }
    return 0;
}

function sendReplyTweet(client, original_tweet, text) {
    var screenName = original_tweet.user.screen_name;
    var message = '@' + screenName + ' ' + text;
    
    if (screenName != botScreenName) {
        client.post('statuses/update', {
            status: message,
            in_reply_to_status_id: original_tweet.id_str
        }, function (error, tweet, response) {
            console.log(error);
            console.log(text);
        });
    }
}