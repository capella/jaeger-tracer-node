const util = require('../util')
const tracer = require('../core/tracer')

module.exports = function (object) {
  util.wrap(object.Sequelize.prototype, 'query', original => {
    return function (sql, options) {
      let parent = tracer.currentSpan()
      let spanName = 'SQL'
      if (options && options.type) {
        spanName = 'SQL ' + options.type
      } else if (sql && sql.split(' ').length > 0) {
        spanName = 'SQL ' + sql.split(' ')[0]
      }
      let span = parent.startSpan(spanName, {
        'db.instance': this.config.database,
        'db.statement': sql,
        'db.type': 'sql',
        'db.user': this.config.username,
        'span.kind': 'client'
      })

      return original.apply(this, arguments).then(
        result => {
          span.finish()
          return result
        },
        err => {
          span.finish(err)
          throw err
        }
      )
    }
  })
}
