import mobileBannerModel, { IMobileBanner } from "../models/mobileBanner.model";

export interface IOnBoardMobileBannerParams {
  name: string;
  link: string;
  imageUrl: string;
}

export class MobileBannerRepository {
    private _model = mobileBannerModel;

    async onBoardBanner(params: IOnBoardMobileBannerParams): Promise<IMobileBanner> {
        return this._model.create({
          name: params.name,
          link: params.link,
          imageUrl: params.imageUrl
        });
    }

    async getBannerById(id: string): Promise<IMobileBanner | null> {
        return this._model.findById(id).select('_id name link imageUrl createdAt updatedAt').lean<IMobileBanner>();
    }

    async getAllBanners(): Promise<IMobileBanner[]> {
    return this._model.find({}).select('_id name link imageUrl createdAt updatedAt');
    }

    async updateBanner(params: {
    _id: string;
    name?: string;
    link?: string;
    imageUrl?: string;
    }): Promise<IMobileBanner | null> {
    const { _id, name, link, imageUrl } = params;
    return this._model.findByIdAndUpdate(
        _id,
        { name, link, imageUrl },
        { new: true }
    );
    }

    async deleteBanner(id: string): Promise<IMobileBanner | null> {
    return this._model.findByIdAndDelete(id).lean<IMobileBanner>();
    }
}