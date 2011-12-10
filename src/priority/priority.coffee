
# Include module dependencies.
fs = require 'fs'
express = require 'express'
inflect = require 'inflect'
_ = require 'underscore'

# ### Module Export
#    `boot(options)` 
exports.boot = (options) ->
  priority = new Priority(options)
  priority.bootApplication()
  priority.bootControllers()

# ### Priority Class
#
class Priority
  constructor: (config) ->
    # #### Defaults

    # Express app instance
    @app = null
    # App directory that contains `controllers` and `views` directories
    @dir = null
    # Vendor config for view rendering
    @render =
      # Vendor module
      vendor: require 'ejs'
      # Extenstions for views
      ext: '.html'
      # Express view engine name
      engine: 'html'
    # Vendor session config - see connect.js session options
    @session =
      # Used to hash session
      secret: "33kTh3C4t!"
      # Vendor store - defaults to `redis`
      store: null
      maxAge:  24 * 60 * 60 * 1000
    # Overwrite defaults with `config`
    return _.defaults config, this
  
  # #### Boot Application
  # Setup Express with boilerplate middleware, configs, and dynamic helpers.
  #
  bootApplication: ->
    # Load Express middleware
    this.app.use express.logger ':method :url :status'
    this.app.use express.bodyParser()
    this.app.use express.methodOverride()
    this.app.use express.cookieParser()
    self = this;
    store = this.session.store or new (require('connect-redis')(express))
    this.app.use express.session { secret: self.session.secret, store: store, maxAge: self.session.maxAge }
    this.app.use this.app.router

    # Map application errors to a default `500.html` page, located in the views directory
    this.app.error (err, req, res) ->
      res.render '500'

    # `404.html` mapping for when Express runs out of matching routes, located in views directory
    this.app.use (req, res) ->
      res.render '404'

    # Configure Express view config
    this.app.set 'views', this.dir + '/views'
    this.app.register this.render.ext, this.render.vendor
    this.app.set 'view engine', this.render.engine

    # Setup some dynamic helpers 
    this.app.dynamicHelpers
      request: (req) ->
        return req
      # Configure helpers for session attributes that return/flash messages in the view.
      hasMessages: (req) ->
        return false if not req.session
        return Object.keys(req.session.flash or {}).length
      messages: (req) ->
        return ->
          msgs = req.flash()
          return Object.keys(msgs).reduce((arr, type) -> 
            return arr.concat msgs[type]
          , [])

  # #### Boot Controllers
  # Find all of the files/controllers in `this.controllers` directory and boot them.
  #
  bootControllers: ->
    fs.readdir this.dir + '/controllers', (err, files) =>
      throw err if err
      files.forEach (file) =>
        this.bootController file

  # #### Boot Controller
  #
  # Loop through a controller's keys, looking for the following reserved actions/keywords:
  #
  # - `__index` : A reserved action name that maps an Express route to the root of the
  #  application and should only be defined once in an application, across all controllers.
  #
  # - *CRUD Actions* : The following are reserved CRUD actions: `index`, `show`, `new`, 
  # `edit`, `create`, `update`, and `destroy`. They all have default mappings with an `:id`
  # parameter, where applicable, which is by default numerical. CRUD actions may have 
  # overriden routes in the `routes` object.
  #
  # - *Custom Actions* : Any action that is prefixed with one of the Express Route API 
  # keywords - `get`, `put`, `post`, or `del`. The action name when uncapitalized should
  # have a route mapping in the `routes` object. For example, the custom action `getFromTo`
  # would have a mapping at `routes.fromTo`.
  #
  # - `routes` : An object that contains routing information for the actions in the controller.
  #
  # - `params` : An object that is used to load Express param-callback param mappings. 
  #
  bootController: (file) ->
    name = file.replace('.js', '')
    actions = require(this.dir + '/controllers' + '/' + name)
    plural = inflect.pluralize(name)
    prefix = '/' + plural
    hasRoutedIndex = false
    method = 'get'

    Object.keys(actions.params or []).map (param) =>
      this.app.param param, actions.params[param].bind(actions)

    Object.keys(actions).map (action) =>

      if not _.isFunction(actions[action]) or
          action is 'initialize' or
          (action isnt '__index' and action.indexOf('_') is 0)
        return

      # Break any custom action definitions into the `method` and `customAction` parts.
      if action.match /(get|post|put|del)(.+)/
        method = RegExp.$1
        customAction = RegExp.$2.substring(0,1).toLowerCase() + RegExp.$2.substring(1)

      resolveTo = if action is '__index' then 'index' else customAction or action
      fn = this.controllerAction name, plural, resolveTo, actions[action]

      switch action
        when '__index'
          if hasRoutedIndex
            console.log 'More than one __index was attempted to be routed.'
            break
          hasRoutedIndex = yes
          route = '/'
          break
        when 'index'
          route = prefix
          break
        when 'show'
          route = prefix + (actions.routes.show or '/:id([0-9]+).:format?')
          break
        when 'new'
          route = prefix + (actions.routes.add or '/:id([0-9]+)/new')
          break
        when 'create'
          route = prefix + (actions.routes.create or '/:id([0-9]+)')
          method = 'post'
          break
        when 'edit'
          route = prefix + (actions.routes.edit or '/:id([0-9]+)/edit')
          break
        when 'update'
          route = prefix + (actions.routes.update or '/:id([0-9]+)')
          method = 'put'
        when 'destroy'
          route = prefix + (actions.routes.destroy or '/:id([0-9]+)')
          method = 'del'
        # Custom action route mapping
        else
          route = prefix + actions.routes[customAction]

      # Setup an Express route with the method and path
      this.app[method] route, fn

    # Call the `initialize` callback
    actions.initialize this.app if actions.initialize
  
  # #### Controller Action
  #
  # Action
  controllerAction: (name, plural, action, fn) ->
    self = this
    return (req, res, next) ->
      format = req.params.format
      path = self.dir + '/views/' + name + '/' + action + '.html'
      res.priority = (obj, options = {}, fn) ->
        return res.render obj, options, fn if _.isString(obj)

        if action is 'show' and format
          return res.send obj if format is 'json'
          throw new Error('unsupported format "' + format + '"')

        if _.isArray obj then options[plural] = obj else options[name] = obj
        return res.render(path, options, fn)

      fn.apply(this, arguments)

