const fs = require('fs');
const request = require('request');

exports.title = 'auto_xchange';

const botScreenName = process.env.BOT_SCREEN_NAME;

const defaultConfig = {
    output_message: {
        real: '$1 $2$3 현재 $4원입니다.',
        psuedo: '$1 $2 $3 현재 $4원 정도입니다.',
        material: '$1 $2 $3$4 현재 $5원입니다.',
        krw: '$1 $2$3 $4원입니다.',
        error: '현재 환율 시스템에 오류가 있는 것 같습니다. 개발자에게 문의해 주세요.',
        duplicate: '\'$1\'의 이름을 가진 화폐가 여러 가지인 것 같습니다. 조금 더 정확히 멘션해 주세요.\n\n지원되는 \'$1\' 목록:\n'
    },

    default: [{
        code: 'USD',
        criteria: ['usd', 'dollar', '달러', '딸라', '$', '사달라', '사딸라'],
        name: '달러',
        screen: '달러는',
        prefix: '💵',
        psuedo: false,
        material: false,
        endpoint: 'fcc'
    },
    {
        code: 'JPY',
        criteria: ['jpy', 'yen', '엔', '¥', '円'],
        name: '엔',
        screen: '엔은',
        prefix: '💴',
        psuedo: false,
        material: false,
        endpoint: 'fcc'
    },
    {
        code: 'STAR_JEWEL',
        criteria: ['쥬얼', '주얼', 'ジュエル'],
        name: '스타 쥬얼',
        screen: '데레스테 스타 쥬얼은',
        prefix: '🌟',
        psuedo: true,
        material: false,
        original_code: 'JPY',
        origin: '아이돌마스터 신데렐라 걸즈 스타라이트 스테이지',
        origin_short: '데레스테',
        origin_aliases: ['데레스테'],
        calculate: 'if (value < 360) { value / 0.5 * 1.1 } else if (value < 760) { value / 0.75 * 1.1 } else if (value < 1300) { value / 0.79 * 1.1 } else if (value < 2650) { value / 0.81 * 1.1 } else if (value < 4200) { value / 0.83 * 1.1 } else if (value < 8400) { value / 0.84 * 1.1 } else { value / 0.86 * 1.1 }',
        endpoint: 'fcc'
    },
    {
        code: 'XAU',
        criteria: ['금'],
        name: '금',
        screen: '금',
        prefix: '🥇',
        psuedo: false,
        material: true,
        endpoint: 'fcc'
    }
    ],

    endpoints: [{
        code: 'fcc',
        url: 'http://free.currencyconverterapi.com/api/v3/convert?q=$from_$to&compact=y',
        value: 'exchangeData[Object.keys(exchangeData)[0]].val'
    }]
};

const criterias = new Map();
let criteriaKeys = [];

const tr_ounce = 31.1034768;

let config = defaultConfig;
const configPath = './modules/auto_xchange/config.json';

function initCriterion() {
    for (let i = 0; i < config.default.length; i++) {
        const currency = config.default[i];

        for (let j = 0; j < currency.criteria.length; j++) {
            const criteria = currency.criteria[j];

            if (criterias.has(criteria)) {
                const temp = criterias.get(criteria);
                temp.push(currency);
                criterias.set(criteria, temp);
            } else {
                criterias.set(criteria, [currency]);
            }
        }
    }

    criteriaKeys = Array.from(criterias.keys());
    criteriaKeys.sort(function (a, b) {
        return b.length - a.length || a.localeCompare(b);
    });

    console.log(criteriaKeys);
}

function getConfig() {
    fs.open(configPath, 'r', (err) => {
        if (err) {
            fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 4), (writeErr) => {
                if (writeErr) {
                    console.log(writeErr);
                    return;
                }
                console.log('Made configuration file for modules/auto_xchange.');
            });
        } else {
            fs.readFile(configPath, 'utf8', (readErr, data) => {
                if (readErr) {
                    console.log(readErr);
                    return;
                }
                console.log('Got configurations for modules/auto_xchange.');
                try {
                    config = JSON.parse(data);
                    initCriterion();
                } catch (parseErr) {
                    console.log(parseErr);
                }
            });
        }
    });
}

getConfig();

function containsAny(str, substrings) {
    for (let i = 0; i !== substrings.length; i++) {
        const substring = substrings[i];
        if (str.indexOf(substring) !== -1) {
            return true;
        }
    }
    return false;
}

function extractNumber(str) {
    const s = str.replace(/,/g, '').split(' ');
    let i;
    for (i = 0; i < s.length; i++) {
        try {
            if (s[i].match(/[+-]?\d+(\.\d+)?/g).length !== 0) {
                return s[i].match(/[+-]?\d+(\.\d+)?/g);
            }
        } catch (e) { /* do nothing */ }
    }
    return 0;
}

function sendReplyTweet(client, original_tweet, text) {
    const screenName = original_tweet.user.screen_name;
    const message = `@${screenName} ${text}`;

    if (screenName !== botScreenName) {
        client.post('statuses/update', {
            status: message,
            in_reply_to_status_id: original_tweet.id_str
        }, (error) => {
            console.log(error);
            console.log(text);
        });
    }
}

function reply(args) {
    let endpoint;
    for (let i = 0; i !== config.endpoints.length; i++) {
        if (config.endpoints[i].code === args.currency.endpoint) {
            endpoint = config.endpoints[i];
            break;
        }
    }

    if (args.code !== 'KRW') {
        if (endpoint === undefined) return;

        let url = endpoint.url.replace('$to', 'KRW'.toLowerCase());

        if (!args.currency.psuedo) {
            url = url.replace('$from', args.currency.code.toLowerCase());
        } else {
            url = url.replace('$from', args.currency.original_code.toLowerCase());
        }

        request(url, (error, response, body) => {
            if (body) {
                console.log(body);
                const exchangeData = JSON.parse(body);

                if (Object.keys(exchangeData).length >= 1) {
                    const rate = eval(endpoint.value);

                    if (args.currency.material) {
                        let units = 'g';
                        let unit_multiplier = 1;

                        if (containsAny(args.text, ['mg', '밀리그람', '밀리그램'])) {
                            units = 'mg';
                            unit_multiplier = 0.0001;
                        }
                        if (containsAny(args.text, ['kg', '킬로', '킬로그람', '킬로그램'])) {
                            units = 'kg';
                            unit_multiplier = 1000;
                        }

                        let message = config.output_message.material;
                        message = message.replace('$1', args.currency.prefix);
                        message = message.replace('$2', args.currency.screen);
                        message = message.replace('$3', (args.value * 1).toLocaleString());
                        message = message.replace('$4', `${units}는`);
                        message = message.replace('$5', (Math.round((args.value * rate * unit_multiplier) / tr_ounce)).toLocaleString());

                        sendReplyTweet(args.client, args.tweet, message);
                    } else if (args.currency.psuedo) {
                        let message = config.output_message.psuedo;
                        console.log(args.currency.calculate.replace(/value/gi, args.value));

                        message = message.replace('$1', args.currency.prefix);
                        message = message.replace('$2', (args.value * 1).toLocaleString());
                        message = message.replace('$3', args.currency.screen);
                        message = message.replace('$4', (Math.round(eval(args.currency.calculate.replace(/value/gi, args.value)) * rate)).toLocaleString());

                        sendReplyTweet(args.client, args.tweet, message);
                    } else {
                        let message = config.output_message.real;
                        message = message.replace('$1', args.currency.prefix);
                        message = message.replace('$2', (args.value * 1).toLocaleString());
                        message = message.replace('$3', args.currency.screen);
                        message = message.replace('$4', (Math.round(args.value * rate)).toLocaleString());

                        sendReplyTweet(args.client, args.tweet, message);
                    }
                } else {
                    sendReplyTweet(args.client, args.tweet, config.output_message.error);
                }
            } else {
                sendReplyTweet(args.client, args.tweet, config.output_message.error);
            }
        });
    } else if (args.currency.psuedo) {
        let message = config.output_message.krw;
        console.log(args.currency.calculate.replace(/value/gi, args.value));

        message = message.replace('$1', args.currency.prefix);
        message = message.replace('$2', (args.value * 1).toLocaleString());
        message = message.replace('$3', args.currency.screen);
        message = message.replace('$4', (Math.round(eval(args.currency.calculate.replace(/value/gi, args.value)))).toLocaleString());

        sendReplyTweet(args.client, args.tweet, message);
    }
}

exports.process = (client, tweet) => {
    const {
        text
    } = tweet;

    const enabled = true;

    let value = extractNumber(text);
    if (containsAny(text, ['사달라', '사딸라'])) value = 4;
    if (value <= 0) return;

    if (enabled) {
        for (let i = 0; i < criteriaKeys.length; i++) {
            const currencies = criterias.get(criteriaKeys[i]);

            if (text.toLowerCase().indexOf(criteriaKeys[i]) === -1) continue;

            if (currencies.length === 1) {
                const currency = criterias.get(criteriaKeys[i])[0];

                let {
                    code
                } = currency;
                if (currency.psuedo) code = currency.original_code;

                console.log(`[xchange] Parsed: @${tweet.user.screen_name}: ${text}`);
                console.log(`[xchange] Requesting conversion: ${value} ${currency.code}`);

                const params = {
                    text,
                    code,
                    currency,
                    value,
                    client,
                    tweet
                };

                reply(params);
            } else if (currencies.length > 1) {
                let finalCurrency;
                let supportedCurrenciesMessage = '';
                let supportedCurrenciesCount = 0;
                let originFoundFlag = false;

                for (let j = 0; j < currencies.length; j++) {
                    const currency = currencies[j];

                    if (supportedCurrenciesCount < 5) {
                        if (currency.psuedo) {
                            supportedCurrenciesMessage += `- ${currency.name} (${currency.origin})\n`;
                            supportedCurrenciesCount++;
                        } else {
                            supportedCurrenciesMessage += `- ${currency.name} (실제 통화)\n`;
                            supportedCurrenciesCount++;
                        }
                    } else if (supportedCurrenciesCount === 5) {
                        supportedCurrenciesMessage += '등...';
                        supportedCurrenciesCount++;
                    }

                    if (currency.psuedo) {
                        if (text.toLowerCase().indexOf(currency.origin) !== -1 ||
                            containsAny(text.toLowerCase(), currency.origin_aliases)) {
                            finalCurrency = currency;
                            originFoundFlag = true;
                            break;
                        }
                    } else if (text.toLowerCase().indexOf(criteriaKeys[i]) !== -1) {
                        finalCurrency = currency;
                        originFoundFlag = true;
                        break;
                    }
                }

                if (originFoundFlag) {
                    let {
                        code
                    } = finalCurrency;
                    if (finalCurrency.psuedo) code = finalCurrency.original_code;
                    const currency = finalCurrency;

                    console.log(`[xchange] Parsed: @${tweet.user.screen_name}: ${text}`);
                    console.log(`[xchange] Requesting conversion: ${value} ${finalCurrency.code}`);

                    const params = {
                        text,
                        code,
                        currency,
                        value,
                        client,
                        tweet
                    };

                    reply(params);
                } else {
                    let message = config.output_message.duplicate;
                    message = message.replace('$1', criteriaKeys[i]);
                    message = message.replace('$1', criteriaKeys[i]);
                    message += supportedCurrenciesMessage;
                    sendReplyTweet(client, tweet, message);
                }
            }

            break;
        }
    }
};
