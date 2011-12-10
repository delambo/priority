
/**
 * `index` Controller.
 *
 * This is an example controller which demonstrates the use of the reserved `__index`
 * action.  The `__index` action should only be declared once per project and will 
 * map the index route - `/`.
 *
 */
module.exports = {

  __index: function(req, res){
    res.priority();
  }
};