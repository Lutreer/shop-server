const Base = require('./base.js');
const moment = require('moment');

module.exports = class extends Base {
  /**
   * index action
   * @return {Promise} []
   */
  async indexAction() {
    const startTime = this.get('startTime') ? moment(this.get('startTime')).format('YYYY-MM-DD HH:mm:ss') : moment().subtract(60, 'day').format('YYYY-MM-DD 00:00:00');
    const endTime = this.get('endTime') ? moment(this.get('endTime')).format('YYYY-MM-DD HH:mm:ss') : moment().add(1, 'days').format('YYYY-MM-DD 00:00:00');

    const model = this.model('order_goods');
    const data = await model.where({add_time: {'>': startTime, '<': endTime}}).select();

    return this.success(data);
  }


};
