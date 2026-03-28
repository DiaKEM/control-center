import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JobManagerService } from './job-manager.service';
import { JOB_TYPE_KEYS, type JobTypeKey } from '../job-type/job-type.registry';

class TriggerJobsDto {
  /** Subset of job type keys to run. Runs all if omitted or empty. */
  keys?: JobTypeKey[];
}

@ApiTags('job-manager')
@ApiBearerAuth()
@Controller('/api/job-manager')
export class JobManagerController {
  constructor(private readonly jobManager: JobManagerService) {}

  @Post('trigger')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger one or more job types' })
  @ApiOkResponse()
  async trigger(@Body() body: TriggerJobsDto): Promise<void> {
    const keys =
      body.keys && body.keys.length > 0
        ? body.keys.filter((k) => (JOB_TYPE_KEYS as readonly string[]).includes(k))
        : [...JOB_TYPE_KEYS];

    await Promise.all(keys.map((key) => this.jobManager.run(key)));
  }
}
