
module.exports = class extends think.Model {

  async getGoodCommonPic() {
    let data = await this.where({status: 1, app_type: 'mina'}).field(['good_footer_pic_url', 'good_header_pic_url']).find()
    return data
  }
}