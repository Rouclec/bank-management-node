class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((field) => {
      delete queryObj[field];
    });

    //b) Advanced Filetering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    // let query = Tour.find(JSON.parse(queryStr));
    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query == this.query.sort(sortBy);
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query.select('-__v');
    }

    return this;
  }
  paginate() {
    if (this.queryString.page && this.queryString.limit) {
      const page = this.queryString.page * 1;
      const limit = this.queryString.limit * 1;
      const skip = (page - 1) * limit;
      this.query = this.query.skip(skip).limit(limit);
    } else {
      this.query = this.query.skip(0).limit(10);
    }
    return this;
  }
}

module.exports = APIFeatures;
