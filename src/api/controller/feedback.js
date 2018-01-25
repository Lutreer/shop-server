const Base = require('./base.js');

module.exports = class extends Base {
  async listAction() {
    const page = this.get('page') || 1
    const size = this.get('size') || 20

    const model = this.model('feedback');
    const data = await model.getList({page, size, title})

    return this.success(data);
  }

  async addAction() {
    if (!this.isPost) {
      return false;
    }
    const values = this.post();
    let feedback = {
      user_id: think.userId,
      typeStr: values.typeStr,
      content: values.typeStr,
      contact: values.contact,
      add_time:['exp', 'CURRENT_TIMESTAMP()'],
      update_time:['exp', 'CURRENT_TIMESTAMP()']
    }

    try{
      const model = this.model('feedback');
      await model.add(feedback)
      return this.success();
    }catch (e){
      return this.fail();
    }
  }


};
