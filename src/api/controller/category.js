const Base = require('./base.js');

module.exports = class extends Base {
  /**
   * 获取分类栏目数据
   * @returns {Promise.<Promise|void|PreventPromise>}
   */
  async indexAction() {
    const model = this.model('category');
    const data = await model.field(['id', 'name']).where({is_show: 1, status: 1}).select();
    return this.success({
      categoryList: data,
      searchPlaceholder: '吃嘛嘛香，身体倍儿棒'
    });
  }

  async currentAction() {
    const categoryId = this.get('id');
    const goodsModel = this.model('goods');
    const categoryModel = this.model('category');

    let currentGoods = null;
    let currentCategory = null;
    if (categoryId) {
      currentCategory = await categoryModel.field(['id', 'name', 'description', 'banner_pic_url']).where({'id': categoryId}).order('sort_order ASC').find()
      currentGoods = await goodsModel.setRelation('goods_sku').where({category_id: categoryId, is_on_sale: 1, status: 1}).select();
    }

    return this.success({
      currentGoods: currentGoods,
      currentCategory: currentCategory
    });
  }
};
