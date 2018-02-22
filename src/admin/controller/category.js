const Base = require('./base.js');
const _ = require('lodash');

module.exports = class extends Base {
  /**
   * index action
   * @return {Promise} []
   */
  async indexAction() {
    const model = this.model('category');
    const category = await model.where({status: 1}).order(['sort_order ASC']).select();
    return this.success(category);
  }

  async infoAction() {
    const id = this.get('id');
    const model = this.model('category');
    const data = await model.where({id: id}).find();

    return this.success(data);
  }

  async storeAction() {
    if (!this.isPost) {
      return false;
    }

      const values = this.post();
      const id = this.post('id');

      const model = this.model('category');
      values.is_show = values.is_show ? 1 : 0;
      if (id > 0) {
        delete values.id;
        await model.where({id: id}).update(values);
      } else {
        delete values.id;
        await model.add(values);
      }
      return this.success(values);
  }
  async destoryAction() {
    const id = this.post('id');
    await this.model('category').where({id: id}).limit(1).update({status: 0});
    return this.success();
  }

  async updatePicAction() {
    if (!this.isPost) {
      return false;
    }
    const values = this.post();
    const id = this.post('id');

    const model = this.model('category');

    if (id > 0) {
      await model.where({id: id}).update(values);
    } else {
      return this.fail();
    }
    return this.success();
  }
};
