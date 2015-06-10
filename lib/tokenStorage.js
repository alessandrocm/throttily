// Copyright 2012 Mark Cavage <mcavage@gmail.com> All rights reserved.

'use strict';

var assert = require('assert-plus');
var LRU = require('lru-cache');


///---a- Class (TokenBucket)

/**
 * An implementation of the Token Bucket algorithm.
 *
 * Basically, in network throttling, there are two "mainstream"
 * algorithms for throttling requests, Token Bucket and Leaky Bucket.
 * For restify, I went with Token Bucket.  For a good description of the
 * algorithm, see: http://en.wikipedia.org/wiki/Token_bucket
 *
 * In the options object, you pass in the total tokens and the fill rate.
 * Practically speaking, this means "allow `fill rate` requests/second,
 * with bursts up to `total tokens`".  Note that the bucket is initialized
 * to full.
 *
 * Also, in googling, I came across a concise python implementation, so this
 * is just a port of that. Thanks http://code.activestate.com/recipes/511490 !
 *
 * @param {Object} options contains the parameters:
 *                   - {Number} capacity the maximum burst.
 *                   - {Number} fillRate the rate to refill tokens.
 */
function TokenBucket(options) {
    assert.object(options, 'options');
    assert.number(options.capacity, 'options.capacity');
    assert.number(options.fillRate, 'options.fillRate');

    this.tokens = this.capacity = options.capacity;
    this.fillRate = options.fillRate;
    this.time = Date.now();
}


/**
 * Consume N tokens from the bucket.
 *
 * If there is not capacity, the tokens are not pulled from the bucket.
 *
 * @param {Number} tokens the number of tokens to pull out.
 * @return {Boolean} true if capacity, false otherwise.
 */
TokenBucket.prototype.consume = function consume(tokens) {
    if (tokens <= this._fill()) {
        this.tokens -= tokens;
        return (true);
    }

    return (false);
};


/**
 * Fills the bucket with more tokens.
 *
 * Rather than do some whacky setTimeout() deal, we just approximate refilling
 * the bucket by tracking elapsed time from the last time we touched the bucket.
 *
 * Simply, we set the bucket size to min(totalTokens,
 *                                       current + (fillRate * elapsed time)).
 *
 * @return {Number} the current number of tokens in the bucket.
 */
TokenBucket.prototype._fill = function _fill() {
    var now = Date.now();

    // reset account for clock drift (like DST)
    if (now < this.time) {
        this.time = now - 1000;
    }

    if (this.tokens < this.capacity) {
        var delta = this.fillRate * ((now - this.time) / 1000);
        this.tokens = Math.min(this.capacity, this.tokens + delta);
    }
    this.time = now;

    return (this.tokens);
};


///--- Internal Class (TokenTable)
// Just a wrapper over LRU that supports put/get to store token -> bucket
// mappings

function TokenTable(options) {
    assert.object(options, 'options');

    this.table = new LRU(options.size || 10000);
}


TokenTable.prototype.put = function put(key, value) {
    this.table.set(key, value);
};


TokenTable.prototype.get = function get(key) {
    return (this.table.get(key));
};

TokenTable.prototype.reset = function() {
   this.table.reset();  
};

module.exports = {
    Bucket: TokenBucket,
    Table:  TokenTable
};