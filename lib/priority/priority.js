var Priority, express, fs, inflect, _;
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
fs = require('fs');
express = require('express');
inflect = require('inflect');
_ = require('underscore');
exports.boot = function(options) {
  var priority;
  priority = new Priority(options);
  priority.bootApplication();
  return priority.bootControllers();
};
Priority = (function() {
  function Priority(config) {
    this.app = null;
    this.dir = null;
    this.render = {
      vendor: require('ejs'),
      ext: '.html',
      engine: 'html'
    };
    this.session = {
      secret: "33kTh3C4t!",
      store: null,
      maxAge: 24 * 60 * 60 * 1000
    };
    return _.defaults(config, this);
  }
  Priority.prototype.bootApplication = function() {
    var self, store;
    this.app.use(express.logger(':method :url :status'));
    this.app.use(express.bodyParser());
    this.app.use(express.methodOverride());
    this.app.use(express.cookieParser());
    self = this;
    store = this.session.store || new (require('connect-redis')(express));
    this.app.use(express.session({
      secret: self.session.secret,
      store: store,
      maxAge: self.session.maxAge
    }));
    this.app.use(this.app.router);
    this.app.error(function(err, req, res) {
      return res.render('500');
    });
    this.app.use(function(req, res) {
      return res.render('404');
    });
    this.app.set('views', this.dir + '/views');
    this.app.register(this.render.ext, this.render.vendor);
    this.app.set('view engine', this.render.engine);
    return this.app.dynamicHelpers({
      request: function(req) {
        return req;
      },
      hasMessages: function(req) {
        if (!req.session) {
          return false;
        }
        return Object.keys(req.session.flash || {}).length;
      },
      messages: function(req) {
        return function() {
          var msgs;
          msgs = req.flash();
          return Object.keys(msgs).reduce(function(arr, type) {
            return arr.concat(msgs[type]);
          }, []);
        };
      }
    });
  };
  Priority.prototype.bootControllers = function() {
    return fs.readdir(this.dir + '/controllers', __bind(function(err, files) {
      if (err) {
        throw err;
      }
      return files.forEach(__bind(function(file) {
        return this.bootController(file);
      }, this));
    }, this));
  };
  Priority.prototype.bootController = function(file) {
    var actions, hasRoutedIndex, method, name, plural, prefix;
    name = file.replace('.js', '');
    actions = require(this.dir + '/controllers' + '/' + name);
    plural = inflect.pluralize(name);
    prefix = '/' + plural;
    hasRoutedIndex = false;
    method = 'get';
    Object.keys(actions.params || []).map(__bind(function(param) {
      return this.app.param(param, actions.params[param].bind(actions));
    }, this));
    Object.keys(actions).map(__bind(function(action) {
      var customAction, fn, resolveTo, route;
      if (!_.isFunction(actions[action]) || action === 'initialize' || (action !== '__index' && action.indexOf('_') === 0)) {
        return;
      }
      if (action.match(/(get|post|put|del)(.+)/)) {
        method = RegExp.$1;
        customAction = RegExp.$2.substring(0, 1).toLowerCase() + RegExp.$2.substring(1);
      }
      resolveTo = action === '__index' ? 'index' : customAction || action;
      fn = this.controllerAction(name, plural, resolveTo, actions[action]);
      switch (action) {
        case '__index':
          if (hasRoutedIndex) {
            console.log('More than one __index was attempted to be routed.');
            break;
          }
          hasRoutedIndex = true;
          route = '/';
          break;
        case 'index':
          route = prefix;
          break;
        case 'show':
          route = prefix + (actions.routes.show || '/:id([0-9]+).:format?');
          break;
        case 'new':
          route = prefix + (actions.routes.add || '/:id([0-9]+)/new');
          break;
        case 'create':
          route = prefix + (actions.routes.create || '/:id([0-9]+)');
          method = 'post';
          break;
        case 'edit':
          route = prefix + (actions.routes.edit || '/:id([0-9]+)/edit');
          break;
        case 'update':
          route = prefix + (actions.routes.update || '/:id([0-9]+)');
          method = 'put';
          break;
        case 'destroy':
          route = prefix + (actions.routes.destroy || '/:id([0-9]+)');
          method = 'del';
          break;
        default:
          route = prefix + actions.routes[customAction];
      }
      return this.app[method](route, fn);
    }, this));
    if (actions.initialize) {
      return actions.initialize(this.app);
    }
  };
  Priority.prototype.controllerAction = function(name, plural, action, fn) {
    var self;
    self = this;
    return function(req, res, next) {
      var format, path;
      format = req.params.format;
      path = self.dir + '/views/' + name + '/' + action + '.html';
      res.priority = function(obj, options, fn) {
        if (options == null) {
          options = {};
        }
        if (_.isString(obj)) {
          return res.render(obj, options, fn);
        }
        if (action === 'show' && format) {
          if (format === 'json') {
            return res.send(obj);
          }
          throw new Error('unsupported format "' + format + '"');
        }
        if (_.isArray(obj)) {
          options[plural] = obj;
        } else {
          options[name] = obj;
        }
        return res.render(path, options, fn);
      };
      return fn.apply(this, arguments);
    };
  };
  return Priority;
})();