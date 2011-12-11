## priority.js

Organize an Express app with mvc conventions.

*This node module was extracted from an unfinished (really just started) node.js app. I'm pre-maturely storing it in this public repo so that others can fork and evolve it, or so I can someday return to it in a future project. The functionality for `priority` was inspired by the Express mvc example by TJ Holowaychuk.*

[annotated source](http://delambo.github.com/priority/docs/src/priority.html)

###Controllers:


A Controller can declare any of the following reserved keys for setup + wiring:

>  `initialize` : Function called after the controller boots with an Express app instance.
 

>  `routes` : Object that is used to wire actions with routes in Express.
This is a simple convenience that delegates to the Express routing API.


          routes: {  
            fromTo: '/:from([0-9]+)-:to([0-9]+)',  //  */users/1-3
            userName: '/:id([0-9]+)/name'          //  */users/1/name
          }

> `params` : Object that is used to wire params to a callback. This simply delegates to the Express Param Pre-Conditions.

          params: {
            // pre-process any route with an `:id` param with the following fn
            id: function(req, res, next, id) {
              this._getUser(id, function(err, user) {
                req.user = user;
                next();
             });
           }
         }

> CRUD Actions are also reserved and optional. CRUD actions are auto-wired with the Express routing API, and all `:id` params are mapped with a numeric restriction - ([0-9]+) - but may be overridden in the `routes` object. The following are the reserved CRUD actions and their default routes.

>> `index` : GET `/users`

>> `show` : GET `/users/:id`

>> `create` : POST `/users/:id`

>> `edit` : GET `/users/:id/edit`

>> `update` : PUT `/users/:id`

>> `destroy` : DELETE `/users/:id`

> Custom actions can be defined by prepending an Express Routing verb - `get`, `post`, `put`, and `del` - to an action name. The following are some custom action definitions:

>> `getFromTo` : By convention, this maps to the `fromTo` key in the `routes` object.
 
>> `putUserName` : By convention, this maps to the `userName` key in the `routes` object. 

> Any other, non-action and non-reserved, keys with function values must be defined with a prepended underscore:

>> `_myPrivateFunction`

> Any action response that calls `priority` will forward to the respectively named view by convention. 

          index: function(req, res) {
            res.priority(this._getListOfUsers());
          }

> `priority` delegates to the Express `res.render`. For example, the following actions will map to views:

>> `index` : [VIEW_DIR]/user/index.[VIEW_EXTENSION]

>> `show` : [VIEW_DIR]/user/show.[VIEW_EXTENSION]

>> `getFromTo` : [VIEW_DIR]/user/fromTo.[VIEW_EXTENSION]

###Boot

> To start an app using `priority` - grab the module and call `boot` with a custom config:

          var express = require('express'),
            app = express.createServer(),
            mvc = require('priority');
  
          mvc.boot({
            app: app,                        // pointer to `express` module
            dir: __dirname,                  // path to application
            controllers: 'app/controllers',  // path to controllers
            views: 'app/views',              // path to views
            render: {                        // object to configure views
              vendor: require('ejs'),
              ext: '.html',
              engine: 'html'
            }
         });
         ...
         app.listen(3000);


