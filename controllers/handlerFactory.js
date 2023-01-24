const APIFeatures = require("../utils/apiFeatures");
const catchAsync = require("./../utils/errorHandling");

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) {
      return next(
        res.status(404).json({
          status: "Not Found",
          message: "No such document exists",
        })
      );
    }
    await Model.findByIdAndDelete(req.params.id);
    res.status(204).json({
      status: "Deleted",
      message: "Document Deleted Successfully!",
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res) => {
    const updatedDoc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({
      status: "Updated",
      data: {
        doc: updatedDoc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res) => {
    const newDoc = await Model.create(req.body);

    res.status(201).json({
      status: "Created",
      data: {
        doc: newDoc,
      },
    });
  });

exports.getOne = (Model, populateOptions, selectOptions) =>
  catchAsync(async (req, res) => {
    let query = Model.findById(req.params.id);

    if (populateOptions) query = query.populate(populateOptions);
    if (selectOptions) query = query.select(selectOptions);

    const doc = await query;

    if (!doc) {
      return res.status(404).json({
        status: "Not Found",
        message: "Doc not Found",
      });
    }

    res.status(200).json({
      status: "Success",
      data: {
        doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res) => {
    //To allow for nested GET reviews on Tour
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const docs = await features.query;
    res.status(200).json({
      status: "Success",
      results: docs.length,
      data: {
        docs,
      },
    });
  });
