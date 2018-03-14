const Base = require('./base.js')

module.exports = class extends Base {

  async detailAction() {
    const data = await this.model('app_config').where({status: 1, app_type: 'mina'}).find()
    return this.success(data)
  }

  async updateAction() {
    if (!this.isPost) {
      return false;
    }
    let values = this.post();
    let id = this.post('id');
    delete values.id
    delete values.status
    const model = this.model('app_config');

    if (id > 0) {
      await model.where({id: id}).update(values);
    } else {
      return this.fail();
    }
    return this.success();
  }

  async updatePicAction() {
    if (!this.isPost) {
      return false;
    }
    const values = this.post();
    const id = this.post('id');

    const model = this.model('app_config');

    if (id > 0) {
      await model.where({id: id}).update(values);
    } else {
      return this.fail();
    }
    return this.success();
  }
}

