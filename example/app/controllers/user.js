
// Fake user database for this example
var users = [];

/**
 * `user` Controller.
 *
 * A Controller can declare any of the following reserved keys for setup + wiring:
 *
 *    `initialize` : Function called after the controller boots with an Express app instance.
 *
 *    `routes` : Object that is used to wire actions with routes in Express.
 *          This is a simple convenience that delegates to the Express routing API.
 *
 *    `params` : Object that is used to wire params to a callback. This simply
 *          delegates to the Express Param Pre-Conditions.
 *
 * CRUD Actions are also reserved and optional. CRUD actions are auto-wired with
 * the Express routing API, and all `:id` params are mapped with a numeric 
 * restriction - ([0-9]+) - but may be overridden in the `routes` object. The 
 * following are the reserved CRUD actions and their default routes.
 *
 *    `index` : GET `/users`
 *
 *    `show` : GET `/users/:id`
 *
 *    `create` : POST `/users/:id`
 *
 *    `edit` : GET `/users/:id/edit`
 *
 *    `update` : PUT `/users/:id`
 *
 *    `destroy` : DELETE `/users/:id`
 *
 * Custom actions can be defined by prepending an Express Routing verb - `get`, `post`, 
 * `put`, and `del` - to an action name. The following are some custom action definitions:
 *
 *    `getFromTo` : By convention, this maps to the following key in the `routes` object: `fromTo`
 *  
 *    `putUserName` : By convention, this maps to the following key in the `routes` object: `userName` 
 *
 * Any other, non-action and non-reserved, keys with function values must be defined with a 
 * prepended underscore:
 *
 *    `_myPrivateFunction`
 *
 * Any action response that calls `priority` will forward to the respectively named view by 
 * convention. `priority` delegates to the Express `res.render`. For example, the following
 * actions will map to views:
 *
 *    `index` - [VIEW_DIR]/user/index.[VIEW_EXTENSION]
 *
 *    `show` - [VIEW_DIR]/user/show.[VIEW_EXTENSION]
 *
 *    `getFromTo` - [VIEW_DIR]/user/fromTo.[VIEW_EXTENSION]
 *
 */
module.exports = {

  initialize: function(app) {
    users.push({ id: 0, name: 'Matt', email: 'delambo@gmail.com' });
    users.push({ id: 1, name: 'TJ', email: 'tj@vision-media.ca' });
    users.push({ id: 2, name: 'Simon', email: 'simon@vision-media.ca' });
  },

  routes: {
    fromTo: '/:from([0-9]+)-:to([0-9]+)',
    name: '/:id([0-9]+)/name'
  },

  params: {
    id: function(req, res, next, val) {
      this._getUser(val, function(err, user) {
        if (err) return next(err);
        if (!user) return next(new Error('failed to find user ' + val));
        req.user = user;
        next();
      });
    }
  },

  middleware: {
    isLoggedIn: ['edit', 'update', 'fromTo']
  },

  index: function(req, res) {
    res.priority(users);
  },

  show: function(req, res, next) {
    res.priority(req.user);
  },
  
  edit: function(req, res, next) {
    res.priority(req.user);
  },
  
  create: function(req, res, next) {
    var name = req.params.name,
      email = req.params.email,
      pass = req.params.password,
      cpass = req.params.confirm;
    var hash = require('hash');
    var salt = '33kTh3C4t!' + pass;
  },
  
  update: function(req, res, next) {
    var user = req.user;
    user.name = req.body.user.name;
    req.flash('info', 'Successfully updated _' + user.name + '_.');
    res.redirect('back');
  },
  
  getFromTo: function(req, res, next) {
    var from = req.params.from;
    var to = req.params.to;
    var u = users.reduce(function(val, user) {
      if(user.id >= from && user.id <= to)
        val.push(user);
      return val;
    }, []);
    res.priority(u);
  },
  
  getName: function(req, res, next) {
    // Custom view rendering - use the Express API instead of `priority`
    res.render(__dirname + '/../views/user/customview.html', { user: req.user });
  },
  
  _getUser: function(id, fn) {
    if(users[id]) fn(null, users[id]);
    else fn(new Error('User ' + id + ' does not exist'));
  }
};
