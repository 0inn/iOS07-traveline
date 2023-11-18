import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CreatePostingDto } from './dto/create-posting.dto';
import { UpdatePostingDto } from './dto/update-posting.dto';
import { v4 as uuidv4 } from 'uuid';
import { Repository } from 'typeorm';
import { Posting } from './entities/posting.entity';
import { POSTINGS_REPOSITORY } from './postings.constants';
import {
  headcounts,
  budgets,
  locations,
  themes,
  vehicles,
  withWhos,
} from './postings.types';

@Injectable()
export class PostingsService {
  constructor(
    @Inject(POSTINGS_REPOSITORY)
    private readonly postingsRepository: Repository<Posting>
  ) {}

  async create(createPostingDto: CreatePostingDto) {
    const posting = new Posting();
    posting.id = uuidv4();
    posting.writer = '123456789012345678901234567890123456'; // TODO: 나중에 JWT에서 User의 id 가져오기
    posting.title = createPostingDto.title;
    posting.created_at = new Date();
    posting.start_date = new Date(createPostingDto.startDate);
    posting.end_date = new Date(createPostingDto.endDate);
    posting.days = this.calculateDays(posting.start_date, posting.end_date);
    posting.period = this.selectPeriod(posting.days);
    posting.headcount = this.customIndexOf(
      headcounts,
      createPostingDto.headcount
    );
    posting.budget = this.customIndexOf(budgets, createPostingDto.budget);
    posting.location = this.customIndexOf(locations, createPostingDto.location);
    posting.theme = createPostingDto.theme
      ? createPostingDto.theme.map((e) => themes.indexOf(e))
      : null;
    posting.with_who = createPostingDto.withWho
      ? createPostingDto.withWho.map((e) => withWhos.indexOf(e))
      : null;
    posting.season = this.calculateSeason(posting.start_date);
    posting.vehicle = this.customIndexOf(vehicles, createPostingDto.vehicle);

    return this.postingsRepository.save(posting);
  }

  findAll() {
    return `This action returns all postings`;
  }

  async findOne(id: string) {
    return this.postingsRepository.findOneBy({ id });
  }

  update(id: number, updatePostingDto: UpdatePostingDto) {
    return `This action updates a #${id} posting`;
  }

  async remove(id: string) {
    const user = ''; // TODO: JWT에서 사용자 ID 가져오기
    const posting = await this.postingsRepository.findOneBy({ id });

    if (posting && posting.writer !== user) {
      throw new ForbiddenException(
        '본인이 작성한 게시글만 삭제할 수 있습니다.'
      );
    }

    return this.postingsRepository.delete({ id });
  }

  private calculateDays(startDate: Date, endDate: Date): number {
    return (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24) + 1;
  }

  private selectPeriod(days: number): number {
    return days === 1
      ? 0
      : days === 2
      ? 1
      : days === 3
      ? 2
      : days < 7
      ? 3
      : days < 30
      ? 4
      : 5;
  }

  private customIndexOf(list: string[], value: string): number | null {
    return list.indexOf(value) > -1 ? list.indexOf(value) : null;
  }

  private calculateSeason(startDate: Date): number {
    const month = startDate.getMonth() + 1;
    return month >= 3 && month <= 5
      ? 0
      : month >= 6 && month <= 9
      ? 1
      : month >= 10 && month <= 11
      ? 2
      : 3;
  }
}
