import { IMobileBanner } from "../models/mobileBanner.model";
import { IOnBoardMobileBannerParams, MobileBannerRepository } from "../repository/mobileBanner.repository";

class BannerService {
  constructor(private readonly _mobileBannerRepository: MobileBannerRepository) {}

  async createBanner(params: IOnBoardMobileBannerParams): Promise<IMobileBanner> {
    return this._mobileBannerRepository.onBoardBanner(params);
  }

  async getBannerById(id: string): Promise<IMobileBanner | null> {
    return this._mobileBannerRepository.getBannerById(id);
  }

  async getAllBanners(): Promise<IMobileBanner[]> {
    return this._mobileBannerRepository.getAllBanners();
  }

  async updateBanner(params: {
    _id: string;
    name?: string;
    link?: string;
    imageUrl?: string;
  }): Promise<IMobileBanner | null> {
    return this._mobileBannerRepository.updateBanner(params);
  }

  async deleteBanner(id: string): Promise<IMobileBanner | null> {
    return this._mobileBannerRepository.deleteBanner(id);
  }
}

export default new BannerService(new MobileBannerRepository());
