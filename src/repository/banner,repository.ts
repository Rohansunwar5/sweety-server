import bannerModel, { IBanner } from "../models/banner.model";

export interface IOnBoardBannerParams {
  name: string;
  link: string;
  imageUrl: string;
}

export class BannerRepository {
  private _model = bannerModel;

  async onBoardBanner(params: IOnBoardBannerParams): Promise<IBanner> {
    return this._model.create({
      name: params.name,
      link: params.link,
      imageUrl: params.imageUrl
    });
  }

  async getBannerById(id: string): Promise<IBanner | null> {
    return this._model.findById(id).select('_id name link imageUrl createdAt updatedAt').lean<IBanner>();
  }

  async getAllBanners(): Promise<IBanner[]> {
    return this._model.find({}).select('_id name link imageUrl createdAt updatedAt');
  }

  async updateBanner(params: {
    _id: string;
    name?: string;
    link?: string;
    imageUrl?: string;
  }): Promise<IBanner | null> {
    const { _id, name, link, imageUrl } = params;
    return this._model.findByIdAndUpdate(
      _id,
      { name, link, imageUrl },
      { new: true }
    );
  }

  async deleteBanner(id: string): Promise<IBanner | null> {
    return this._model.findByIdAndDelete(id).lean<IBanner>();
  }
}
