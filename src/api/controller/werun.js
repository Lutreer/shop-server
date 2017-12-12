const Base = require('./base.js');

module.exports = class extends Base {
  /**
   * index action
   * @return {Promise} []
   */
  async indexAction() {
    const page = this.get('page') || 1;
    const size = this.get('size') || 10;
    const title = this.get('title') || '';

    const model = this.model('brand');
    const data = await model.getList({page, size, title})

    return this.success(data);
  }

  async infoAction() {
    const id = this.get('id');
    const model = this.model('brand');
    const data = await model.getDetailById(id);
    return this.success(data);
  }

  async storeAction() {

    if (id > 0) {
      await brandModel.where({id: id}).update(values);
      // 删除所有的旧关联，TODO 可以优化
      await brandGoodsModel.where({brandd_id: id}).delete()
    } else {
      delete values.id;
      var brandId = await brandModel.add(values);
    }
    let goods = []
    goodsId.forEach(goodId => {
      goods.push({
        brandd_id: brandId || id,
        goods_id: goodId
      })
    })
    if(goods.length > 0){
      brandGoodsModel.addMany(goods)
    }

    return this.success(brandId || values.id);
  }



  async updatePicAction() {
    if (!this.isPost) {
      return false;
    }
    const values = this.post();
    const id = this.post('id');

    const model = this.model('brand');

    if (id > 0) {
      await model.where({id: id}).update(values);
    } else {
      return this.fail();
    }
    return this.success();
  }
};
