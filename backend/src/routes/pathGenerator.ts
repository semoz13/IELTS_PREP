export class PathGenerator {
  private base: string;

  constructor(withBase: boolean = false) {
    this.base = withBase ? "http://localhost:3000/api" : "";
  }

  private prepend(path: string): string {
    return `${this.base}${path}`;
  }

  auth = {
    register:           () => this.prepend("/auth/register"),
    login:              () => this.prepend("/auth/login"),
    logout:             () => this.prepend("/auth/logout"),
    me:                 () => this.prepend("/auth/me"),
  };

  users = {
    getAll:             () => this.prepend("/users"),
    getById:            (id: string) => this.prepend(`/users/${id}`),
    create:             () => this.prepend("/users"),
    update:             (id: string) => this.prepend(`/users/${id}`),
    delete:             (id: string) => this.prepend(`/users/${id}`),
  };

  reading={
    getAll:             ()=> this.prepend("/reading"),

    startTest:          () => this.prepend("/reading/start"),
    getAttemptState:    (attemptId: string) =>
      this.prepend      (`/reading/attempt/${attemptId}`),
    saveAnswer:         (attemptId: string) => 
      this.prepend      (`/reading/attempt/${attemptId}/answer`),
    updateTiming:       (attemptId: string) =>
      this.prepend      (`/reading/attempt/${attemptId}/timing`),
    submit:             (attemptId: string) => 
      this.prepend      (`/reading/attempt/${attemptId}/submit`),
  };


  listening = {
    startTest:          () => this.prepend("/listening/start"),
    getAttemptState:    (attemptId: string) => this.prepend(`/listening/attempts/${attemptId}`),
    registerPlay:       (attemptId: string) => this.prepend(`/listening/attempts/${attemptId}/play`),
    saveAnswer:         (attemptId: string) => this.prepend(`/listening/attempts/${attemptId}/answer`),
    submit:             (attemptId: string) => this.prepend(`/listening/attempts/${attemptId}/submit`),    
  };


  writing = {
    startTest:          () => this.prepend("/writing/start"),
    getAttemptState:    (attemptId: string) => this.prepend(`/writing/attempt/${attemptId}`),
    submitTask:         (attemptId: string) => this.prepend(`/writing/attempt/${attemptId}/submit`),
    reviewSubmission:   (submissionId: string) => this.prepend(`/writing/submissions/${submissionId}/review`),
    getPendingReviews:  () => this.prepend("/writing/reviews/pending"),
  };

  speaking = {
    startTest:          () => this.prepend("/speaking/start"),
    getAttemptState:    (attemptId: string) => this.prepend(`/speaking/attempt/${attemptId}`),
    uploadAnswer:       (attemptId: string) => this.prepend(`/speaking/attempt/${attemptId}/upload`),
    submitAttempt:      (attemptId: string) => this.prepend(`/speaking/attempt/${attemptId}/submit`),
    getPendingReviews:  () => this.prepend("/speaking/reviews/pending"),
    markUnderReview:    (submissionId: string) => this.prepend(`/speaking/reviews/${submissionId}/under-review`),
    reviewSubmission:   (submissionId: string) => this.prepend(`/speaking/submissions/${submissionId}/review`),
  };


}

export const paths = new PathGenerator();
// copy this file to the  AI and give it also the routing file ...
//prompt: ple generatea postman collection extention .jsons 