const Base = require('./base.js');

module.exports = class extends Base {
  async indexAction() {
    const model = this.model('goods');
    const goodsList = await model.select();

    return this.success(goodsList)

  }



  /**
   * 商品详情页数据
   * @returns {Promise.<Promise|PreventPromise|void>}
   */
  async detailAction() {
    const goodsId = this.get('id');
    const goods = await this.model('goods').getDetailById(goodsId);

    const cartCount = await this.model('cart').getCartCount()
    // 记录用户的足迹 TODO
    // await await this.model('footprint').addFootprint(think.userId, goodsId);

    // 公共页眉页脚
    const commonPicUrl = await this.model('app_config').getGoodCommonPic()
    goods.desc_pic_url = goods.desc_pic_url.split(",").push(commonPicUrl.good_footer_pic_url).unshift(commonPicUrl.good_header_pic_url).toString();

    return this.success({
      goods: goods,
      cartCount: cartCount
    });
  }

  /**
   * 获取分类下的商品
   * @returns {Promise.<*>}
   */
  async categoryAction() {
    const model = this.model('category');
    const currentCategory = await model.where({id: this.get('id')}).find();
    const parentCategory = await model.where({id: currentCategory.parent_id}).find();
    const brotherCategory = await model.where({parent_id: currentCategory.parent_id}).select();

    return this.success({
      currentCategory: currentCategory,
      parentCategory: parentCategory,
      brotherCategory: brotherCategory
    });
  }

  /**
   * 获取商品列表
   * @returns {Promise.<*>}
   */
  async listAction() {
    const keyword = this.get('keyword') || '';
    const page = this.get('page') || 1;
    const size = this.get('size') || 6;

    let goodsData = await this.model('goods').searchByKeyword(keyword, page, size)

    return this.success(goodsData);
  }

  /**
   * 商品列表筛选的分类列表
   * @returns {Promise.<Promise|void|PreventPromise>}
   */
  async filterAction() {
    const categoryId = this.get('categoryId');
    const keyword = this.get('keyword');
    const isNew = this.get('isNew');
    const isHot = this.get('isHot');

    const goodsQuery = this.model('goods');

    if (!think.isEmpty(categoryId)) {
      goodsQuery.where({category_id: {'in': await this.model('category').getChildCategoryId(categoryId)}});
    }

    if (!think.isEmpty(isNew)) {
      goodsQuery.where({is_new: isNew});
    }

    if (!think.isEmpty(isHot)) {
      goodsQuery.where({is_hot: isHot});
    }

    if (!think.isEmpty(keyword)) {
      goodsQuery.where({name: {'like': `%${keyword}%`}});
    }

    let filterCategory = [{
      'id': 0,
      'name': '全部'
    }];

    // 二级分类id
    const categoryIds = await goodsQuery.getField('category_id', 10000);
    if (!think.isEmpty(categoryIds)) {
      // 查找二级分类的parent_id
      const parentIds = await this.model('category').where({id: {'in': categoryIds}}).getField('parent_id', 10000);
      // 一级分类
      const parentCategory = await this.model('category').field(['id', 'name']).order({'sort_order': 'asc'}).where({'id': {'in': parentIds}}).select();

      if (!think.isEmpty(parentCategory)) {
        filterCategory = filterCategory.concat(parentCategory);
      }
    }

    return this.success(filterCategory);
  }

  /**
   * 新品首发type=1 or 人气推荐type=2的banner
   * @returns {Promise.<Promise|void|PreventPromise>}
   */
  async rankingBannerAction() {
    const type = this.get('type');
    let bannerInfo = await this.model('goods_banner').where({type: type}).find()
    return this.success(bannerInfo);
  }
  /**
   * 新品首发type=1 or 人气推荐type=2的商品
   * @returns {Promise.<Promise|void|PreventPromise>}
   */
  async rankingAction() {
    const type = this.get('type');
    const page = this.get('page') || 0;
    const size = this.get('size') || 10;
    let goods = null
    if(type == 1) {
      goods= await this.model('goods').getNewGoods(page, size)
    }else if(type == 2){
      goods = await this.model('goods').getHotGoods(page, size)
    }

    return this.success(goods);
  }


  // /**
  //  * 商品详情页的大家都在看的商品
  //  * @returns {Promise.<Promise|PreventPromise|void>}
  //  */
  // async relatedAction() {
  //   // 大家都在看商品,取出关联表的商品，如果没有则随机取同分类下的商品
  //   const model = this.model('goods');
  //   const goodsId = this.get('id');
  //   const relatedGoodsIds = await this.model('related_goods').where({goods_id: goodsId}).getField('related_goods_id');
  //   let relatedGoods = null;
  //   if (think.isEmpty(relatedGoodsIds)) {
  //     // 查找同分类下的商品
  //     const goodsCategory = await model.where({id: goodsId}).find();
  //     relatedGoods = await model.where({category_id: goodsCategory.category_id}).field(['id', 'name', 'list_pic_url', 'retail_price']).limit(8).select();
  //   } else {
  //     relatedGoods = await model.where({id: ['IN', relatedGoodsIds]}).field(['id', 'name', 'list_pic_url', 'retail_price']).select();
  //   }
  //
  //   return this.success({
  //     goodsList: relatedGoods
  //   });
  // }

  /**
   * 在售的商品总数
   * @returns {Promise.<Promise|PreventPromise|void>}
   */
  async countAction() {
    const goodsCount = await this.model('goods').where({is_delete: 0, is_on_sale: 1}).count('id');

    return this.success({
      goodsCount: goodsCount
    });
  }
};
