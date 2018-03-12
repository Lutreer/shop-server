
module.exports = class extends think.Model {

  async getContactInfo() {
    const contactInfo = await this.where({status: 1, app_type: 'mina'}).field(['contact_pic_url']).find()
    return contactInfo;
  }
}