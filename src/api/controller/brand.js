const Base = require('./base.js');

module.exports = class extends Base {
  async listAction() {
    const param = {
      page:this.get('page') || 1,
      size: this.get('size') || 10
    }
    const model = this.model('brand');
    const data = await model.getList(param)

    return this.success(data);
  }

  async detailAction() {
    const id = this.get('id')
    const model = this.model('brand');
    const data = await model.getDetailById(id);

    return this.success({brand: data});
  }
};
