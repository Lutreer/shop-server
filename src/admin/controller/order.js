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

    const model = this.model('order');
    const data = await model.where({add_time: {'>': startTime, '<': endTime}}).select();

    return this.success(data);
  }

  // 手动修改订单状态
  async changeOrderStatusAction() {
    let orderId = this.post('orderId')
    let orderStatus = this.post('orderStatus')

    try{
      await this.model('order').updatePayStatus(orderId, orderStatus)
      return this.success()
    }catch (e){
      return this.fail()
    }

  }

  async infoAction() {
    const id = this.get('id');
    const model = this.model('order');
    const data = await model.where({id: id}).find();

    return this.success(data);
  }

  async storeAction() {
    if (!this.isPost) {
      return false;
    }

    const values = this.post();
    const id = this.post('id');

    const model = this.model('order');
    values.is_show = values.is_show ? 1 : 0;
    values.is_new = values.is_new ? 1 : 0;
    if (id > 0) {
      await model.where({id: id}).update(values);
    } else {
      delete values.id;
      await model.add(values);
    }
    return this.success(values);
  }

  async destoryAction() {
    const id = this.post('id');
    await this.model('order').where({id: id}).limit(1).delete();

    // 删除订单商品
    await this.model('order_goods').where({order_id: id}).delete();

    // TODO 事务，验证订单是否可删除（只有失效的订单才可以删除）

    return this.success();
  }
};
