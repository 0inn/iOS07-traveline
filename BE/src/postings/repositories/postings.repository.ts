import { POSTINGS_REPOSITORY } from '../postings.constants';
import { Posting } from '../entities/posting.entity';
import { Inject, Injectable } from '@nestjs/common';
import { Like, Repository } from 'typeorm';
import {
  Budget,
  Headcount,
  Sorting,
  Location,
  Period,
  Season,
  Vehicle,
  Theme,
  WithWho,
} from '../postings.types';

@Injectable()
export class PostingsRepository {
  constructor(
    @Inject(POSTINGS_REPOSITORY)
    private postingsRepository: Repository<Posting>
  ) {}

  async save(posting: Posting) {
    return this.postingsRepository.save(posting);
  }

  async findOne(id: string) {
    return this.postingsRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.writer', 'w')
      .leftJoinAndSelect('p.reports', 'r')
      .leftJoinAndSelect('p.likeds', 'l', 'l.isDeleted = false')
      .where('p.id = :id', { id })
      .getOne();
  }

  async findAll(
    keyword: string,
    sorting: Sorting,
    offset: number,
    limit: number,
    budget: Budget,
    headcount: Headcount,
    locations: Location[],
    period: Period,
    seasons: Season[],
    vehicle: Vehicle,
    themes: Theme[],
    withWhos: WithWho[]
  ) {
    const qb = this.postingsRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.writer', 'user')
      .where('p.title LIKE :keyword', { keyword: `%${keyword}%` });

    if (budget) {
      qb.where('p.budget = :budget', { budget });
    }

    if (headcount) {
      qb.andWhere('p.headcount = :headcount', { headcount });
    }

    if (locations) {
      const orCondtions = locations
        .map((location, index) => `p.location = :location${index}`)
        .join(' OR ');
      const params = locations.reduce(
        (params, location, index) => ({
          ...params,
          [`location${index}`]: location,
        }),
        {}
      );
      qb.andWhere(orCondtions, params);
    }

    if (period) {
      qb.andWhere('p.period = :period', { period });
    }

    if (seasons) {
      const orCondtions = seasons
        .map((season, index) => `p.season = :season${index}`)
        .join(' OR ');
      const params = seasons.reduce(
        (params, season, index) => ({
          ...params,
          [`season${index}`]: season,
        }),
        {}
      );
      qb.andWhere(orCondtions, params);
    }

    if (vehicle) {
      qb.andWhere('p.vehicle = :vehicle', { vehicle });
    }

    if (themes) {
      const orCondtions = themes
        .map((theme, index) => `JSON_CONTAINS(p.theme, :theme${index})`)
        .join(' OR ');
      const params = themes.reduce(
        (params, theme, index) => ({
          ...params,
          [`theme${index}`]: JSON.stringify(theme),
        }),
        {}
      );
      qb.andWhere(orCondtions, params);
    }

    if (withWhos) {
      const orCondtions = withWhos
        .map((withWho, index) => `JSON_CONTAINS(p.with_who, :withWho${index})`)
        .join(' OR ');
      const params = withWhos.reduce(
        (params, withWho, index) => ({
          ...params,
          [`withWho${index}`]: JSON.stringify(withWho),
        }),
        {}
      );
      qb.andWhere(orCondtions, params);
    }

    if (sorting === Sorting.좋아요순) {
      qb.leftJoin('p.likeds', 'liked', 'liked.isDeleted = :isDeleted', {
        isDeleted: false,
      })
        .groupBy('p.id')
        .addSelect('COUNT(liked.posting)', 'likedCount')
        .orderBy('likedCount', 'DESC');
    } else {
      qb.orderBy('p.createdAt', 'DESC');
    }

    return qb
      .skip((offset - 1) * limit)
      .take(limit)
      .getMany();
  }

  async findAllByTitle(keyword: string) {
    return this.postingsRepository.find({
      where: { title: Like(`${keyword}%`) },
      select: ['title'],
    });
  }

  async findAllByWriter(userId: string) {
    return this.postingsRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.writer', 'w')
      .where('p.writer = :userId', { userId })
      .orderBy('post.createdAt', 'DESC')
      .getMany();
  }

  async update(id: string, posting: Posting) {
    return this.postingsRepository.update(id, posting);
  }

  async remove(posting: Posting) {
    return this.postingsRepository.remove(posting);
  }

  async updateThumbnail(id: string, thumbnail: string) {
    return this.postingsRepository.update(id, { thumbnail });
  }
}
