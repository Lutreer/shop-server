const Base = require('./base.js');

module.exports = class extends Base {
  /**
   * index action
   * @return {Promise} []
   */
  async indexAction() {
    const page = this.get('page') || 1;
    const size = this.get('size') || 20;
    const name = this.get('name') || '';

    const goodsModel = this.model('goods');
    const goods = await goodsModel.getList({name, page, size})
    return this.success(goods);
  }

  /**
   * 返回简单的商品数据，供商品选择弹框使用
   * @return {Promise} []
   */
  async simpleGoodsListAction() {
    const page = this.get('page') || 1;
    const size = this.get('size') || 20;
    const name = this.get('name') || '';

    const goodsModel = this.model('goods');
    const goods = await goodsModel.setRelation(false).where({name: ['like', `%${name}%`], status: 1, is_on_sale: 1}).order(['sort_order ASC']).page(page, size).countSelect();
    return this.success(goods);
  }

  async infoAction() {
    const id = this.get('id');
    const model = this.model('goods');
    const data = await model.getDetailById(id);

    return this.success(data);
  }

  async storeAction() {
    if (!this.isPost) {
      return false;
    }

    const values = this.post();
    const id = this.post('id');

    const goodsModel = this.model('goods');
    const goodsSkuModel = this.model('goods_sku').db(goodsModel.db());// 复用当前模型的数据库连接

    values.is_on_sale = values.is_on_sale ? 1 : 0;
    values.is_new = values.is_new ? 1 : 0;
    values.is_hot = values.is_hot ? 1 : 0;

    let goods_sku = values.goods_sku
    delete values.goods_sku

    await goodsModel.transaction(async () => {
      if (id > 0) {
          const good_id = await goodsModel.where({id: id}).update(values);
        for(let i = 0,l = goods_sku.length; i < l; i++) {
          goods_sku[i].is_show = goods_sku[i].is_show ? 1 : 0;
          if(goods_sku[i].id > 0){
            goodsSkuModel.where({id: goods_sku[i].id}).update(goods_sku[i])
          }else{
            delete goods_sku[i].id
            goods_sku[i].goods_id = id
            goodsSkuModel.add(goods_sku[i])
          }

        }
      } else {
        delete values.id;
        values.goods_sn = values.brand_id + new Date().getTime()
        values.add_time = ['exp', 'CURRENT_TIMESTAMP()']
        const good_id = await goodsModel.add(values);
        for(let i = 0,l = goods_sku.length; i < l; i++) {
          goods_sku[i].is_show = goods_sku[i].is_show ? 1 : 0;
          goods_sku[i].goods_id = good_id

          delete goods_sku[i].id
          goodsSkuModel.add(goods_sku[i])

        }
      }
      return this.success(values);
    });// TODO 是锁goods表还是goods_sku和goods分别锁起来呢？
  }

  async destoryAction() {
    const id = this.post('id');
    await this.model('goods').where({id: id}).limit(1).update({status: 0})
    return this.success();
  }
  async skuDeleteAction() {
    const id = this.post('id');
    await this.model('goods_sku').where({id: id}).limit(1).update({status: 0})
    return this.success();
  }

  async updatePicAction() {
    if (!this.isPost) {
      return false;
    }
    const values = this.post();
    const id = this.post('id');

    const model = this.model('goods');

    if (id > 0) {
      await model.where({id: id}).update(values);
    } else {
      return this.fail();
    }
    return this.success();
  }
};
