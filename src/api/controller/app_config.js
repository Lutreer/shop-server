const Base = require('./base.js')

module.exports = class extends Base {

  async kefuAction() {
    const contactInfo = await this.model('app_config').getContactInfo()
    return this.success({data:contactInfo});
  }
}

