const { redisHost, redisPort } = require('./env_vars');
const redis = require('redis');

const redisClient = redis.createClient({
    host: redisHost,
    port: redisPort,
    retry_strategy: () => 1000
});

const sub = redisClient.duplicate();

const calcFib = (index) => {
    if (index < 2) return 1;
    return calcFib(index-1) + calcFib(index-2)
};

sub.on('message', (channel, index) => {
    redisClient.hset('values', index, calcFib(parseInt(index)));
});
sub.subscribe('insert');