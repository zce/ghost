// # Frontend Route tests
// As it stands, these tests depend on the database, and as such are integration tests.
// Mocking out the models to not touch the DB would turn these into unit tests, and should probably be done in future,
// But then again testing real code, rather than mock code, might be more useful...

var should = require('should'),
    supertest = require('supertest'),
    testUtils = require('../../utils/index'),
    configUtils = require('../../utils/configUtils'),
    ghost = testUtils.startGhost,
    common = require('../../../server/lib/common/index'),
    config = require('../../../server/config/index'),
    request;

common.i18n.init();

describe('Admin Routing', function () {
    function doEnd(done) {
        return function (err, res) {
            if (err) {
                return done(err);
            }

            should.not.exist(res.headers['x-cache-invalidate']);
            should.exist(res.headers.date);

            done();
        };
    }

    function doEndNoAuth(done) {
        return function (err, res) {
            if (err) {
                return done(err);
            }

            should.not.exist(res.headers['x-cache-invalidate']);
            should.exist(res.headers.date);

            done();
        };
    }

    before(function () {
        return ghost()
            .then(function () {
                request = supertest.agent(config.get('url'));
            });
    });

    describe('Assets', function () {
        it('should return 404 for unknown assets', function (done) {
            request.get('/reborn/assets/not-found.js')
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .end(doEnd(done));
        });

        it('should retrieve built assets', function (done) {
            request.get('/reborn/assets/vendor.js')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .expect(200)
                .end(doEnd(done));
        });
    });

    describe('Legacy Redirects', function () {
        it('should redirect /logout/ to /reborn/#/signout/', function (done) {
            request.get('/logout/')
                .expect('Location', '/reborn/#/signout/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .expect(301)
                .end(doEndNoAuth(done));
        });

        it('should redirect /signout/ to /reborn/#/signout/', function (done) {
            request.get('/signout/')
                .expect('Location', '/reborn/#/signout/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .expect(301)
                .end(doEndNoAuth(done));
        });

        it('should redirect /signup/ to /reborn/#/signup/', function (done) {
            request.get('/signup/')
                .expect('Location', '/reborn/#/signup/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .expect(301)
                .end(doEndNoAuth(done));
        });

        // Admin aliases
        it('should redirect /signin/ to /reborn/', function (done) {
            request.get('/signin/')
                .expect('Location', '/reborn/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .expect(301)
                .end(doEndNoAuth(done));
        });

        it('should redirect /admin/ to /reborn/', function (done) {
            request.get('/admin/')
                .expect('Location', '/reborn/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .expect(301)
                .end(doEndNoAuth(done));
        });

        it('should redirect /REBORN/ to /reborn/', function (done) {
            request.get('/REBORN/')
                .expect('Location', '/reborn/')
                .expect(301)
                .end(doEndNoAuth(done));
        });
    });

    // we'll use X-Forwarded-Proto: https to simulate an 'https://' request behind a proxy
    describe('Require HTTPS - redirect', function () {
        var ghostServer;

        before(function () {
            configUtils.set('url', 'https://localhost:2390');

            return ghost({forceStart: true})
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    request = supertest.agent(config.get('server:host') + ':' + config.get('server:port'));
                });
        });

        after(function () {
            configUtils.restore();
        });

        it('should redirect admin access over non-HTTPS', function (done) {
            request.get('/reborn/')
                .expect('Location', /^https:\/\/localhost:2390\/reborn\//)
                .expect(301)
                .end(doEnd(done));
        });

        it('should allow admin access over HTTPS', function (done) {
            request.get('/reborn/')
                .set('X-Forwarded-Proto', 'https')
                .expect(200)
                .end(doEnd(done));
        });
    });
});
