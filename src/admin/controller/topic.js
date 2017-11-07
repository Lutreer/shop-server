const Base = require('./base.js');

module.exports = class extends Base {
  /**
   * index action
   * @return {Promise} []
   */
  async indexAction() {
    const page = this.get('page') || 1;
    const size = this.get('size') || 20;
    const title = this.get('name') || '';

    const model = this.model('topic');
    const data = await model.getList({page, size, title})

    return this.success(data);
  }

  async infoAction() {
    const id = this.get('id');
    const model = this.model('topic');
    const data = await model.getDetailById(id)

    return this.success(data);
  }

  async storeAction() {
    if (!this.isPost) {
      return false;
    }

    const values = this.post();
    const id = this.post('id');

    const topicModel = this.model('topic');
    const topicGoodsModel = this.model('topic_goods');
    values.is_show = values.is_show ? 1 : 0;

    const goodsId = values.goods
    delete values.goods
    if (id > 0) {
      await topicModel.where({id: id}).update(values);
      // 删除所有的旧关联，TODO 可以优化
      await topicGoodsModel.where({topic_id: id}).delete()
    } else {
      delete values.id;
      var topicId = await topicModel.add(values);
    }
    let goods = []
    goodsId.forEach(goodId => {
      goods.push({
        topic_id: topicId || id,
        goods_id: goodId
      })
    })
    if(goods.length > 0){
      topicGoodsModel.addMany(goods)
    }

    return this.success(values);
  }

  async destoryAction() {
    const id = this.post('id');
    await this.model('topic').where({id: id}).limit(1).delete();
    // TODO 删除图片

    return this.success();
  }
};
