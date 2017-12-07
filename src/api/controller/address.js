const Base = require('./base.js');

module.exports = class extends Base {
  /**
   * 获取用户的收货地址
   * @return {Promise} []
   */
  async listAction() {
    const addressList = await this.model('address').getList()
    return this.success(addressList);
  }

  /**
   * 获取收货地址的详情
   * @return {Promise} []
   */
  async detailAction() {
    const addressId = this.get('id')
    let addressInfo
    if (addressId) {
      addressInfo = await this.model('address').getDetailById(addressId)
    }

    return this.success(addressInfo)
  }

  /**
   * 添加或更新收货地址
   * @returns {Promise.<Promise|PreventPromise|void>}
   */
  async saveAction() {
    let addressId = this.post('id');

    const addressData = {
      name: this.post('name'),
      mobile: this.post('mobile'),
      province_id: this.post('province_id'),
      city_id: this.post('city_id'),
      district_id: this.post('district_id'),
      address: this.post('address'),
      user_id: this.getLoginUserId(),
      is_default: this.post('is_default') === true ? 1 : 0
    };

    if (think.isEmpty(addressId)) {
      addressId = await this.model('address').add(addressData);
    } else {
      await this.model('address').where({id: addressId, user_id: think.userId}).update(addressData);
    }

    // 如果设置为默认，则取消其它的默认
    if (this.post('is_default') === true) {
      await this.model('address').where({id: ['<>', addressId], user_id: think.userId}).update({
        is_default: 0
      });
    }
    const addressInfo = await this.model('address').where({id: addressId}).find();

    return this.success(addressInfo);
  }

  /**
   * 删除指定的收货地址
   * @returns {Promise.<Promise|PreventPromise|void>}
   */
  async deleteAction() {
    const addressId = this.post('id');

    await this.model('address').where({id: addressId, user_id: think.userId}).delete();

    return this.success('删除成功');
  }
  /**
   * 获取默认收货地址
   * @returns {Promise.<Promise|PreventPromise|void>}
   */
  async defaultAction() {
    const addressInfo = await this.model('address').where({is_default: 1, user_id: think.userId}).find();
    if (!think.isEmpty(addressInfo)) {
      addressInfo.province_name = await this.model('region').getRegionName(addressInfo.province_id);
      addressInfo.city_name = await this.model('region').getRegionName(addressInfo.city_id);
      addressInfo.district_name = await this.model('region').getRegionName(addressInfo.district_id);
      addressInfo.full_region = addressInfo.province_name + addressInfo.city_name + addressInfo.district_name;
    }

    return this.success(addressInfo);
  }

  /**
   * 获取学校
   * @returns {Promise.<Promise|PreventPromise|void>}
   */
  async collegeAction() {
    const college = await this.model('college').where({is_show: 1, status: 1}).order(['sort_order ASC']).select();

    return this.success(college);
  }
};
