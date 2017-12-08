const _ = require('lodash');

module.exports = class extends think.Model {

  get relation() {
    return {
      college: {
        type: think.Model.BELONG_TO,
        where: {status: 1, is_show: 1}
      }
    }
  }
  async getList() {
    const address = await this.setRelation(true).where({user_id: think.userId}).select();
    return address
  }

  async getDetailById(id) {
    const address = await this.setRelation(true).where({user_id: think.userId,id: id}).find()
    return address
  }

  async getDefault() {
    const address = await this.setRelation(true).where({user_id: think.userId, is_default: 1}).find();
    return address
  }
  async getFirst() {
    const address = await this.setRelation(true).where({user_id: think.userId}).limit(1).select();
    return address[0]
  }


};
