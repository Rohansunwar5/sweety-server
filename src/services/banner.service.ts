
import { IBanner } from '../models/banner.model';
import { BannerRepository, IOnBoardBannerParams } from '../repository/banner,repository';

class BannerService {
  constructor(private readonly _bannerRepository: BannerRepository) {}

  async createBanner(params: IOnBoardBannerParams): Promise<IBanner> {
    return this._bannerRepository.onBoardBanner(params);
  }

  async getBannerById(id: string): Promise<IBanner | null> {
    return this._bannerRepository.getBannerById(id);
  }

  async getAllBanners(): Promise<IBanner[]> {
    return this._bannerRepository.getAllBanners();
  }

  async updateBanner(params: {
    _id: string;
    name?: string;
    link?: string;
    imageUrl?: string;
  }): Promise<IBanner | null> {
    return this._bannerRepository.updateBanner(params);
  }

  async deleteBanner(id: string): Promise<IBanner | null> {
    return this._bannerRepository.deleteBanner(id);
  }
}

export default new BannerService(new BannerRepository());
