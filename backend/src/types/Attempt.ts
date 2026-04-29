import { BaseType } from "@/types/BaseType";
import { passageTiming } from "@/types/Reading.type";
import { Types , Schema  } from "mongoose";

export type Attempt = BaseType & { 
    userId: Types.ObjectId;
    testId: Types.ObjectId;
    startedAt: Date;
    finishedAt: Date;
    score?: number;
    passageTimings: passageTiming[];
    status: "in_progress" | "submitted";
};

