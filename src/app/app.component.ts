import { CdkDragDrop, transferArrayItem } from "@angular/cdk/drag-drop";
import { Component } from "@angular/core";
import {
  AngularFirestore,
  AngularFirestoreCollection,
} from "@angular/fire/firestore";
import { MatDialog } from "@angular/material/dialog";
import { BehaviorSubject, Observable } from "rxjs";
import {
  TaskDialogComponent,
  TaskDialogResult,
} from "./task-dialog/task-dialog.component";
import { Task } from "./task/task";

const getObservable = (
  collection: AngularFirestoreCollection<Task>,
): BehaviorSubject<Task[]> => {
  const subject = new BehaviorSubject<Task[]>([]);
  collection.valueChanges({ idField: "id" }).subscribe((val: Task[]) => {
    subject.next(val);
  });
  return subject;
};

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent {
  static DIALOG_SIZE = "270px";

  todo = getObservable(this.store.collection("todo")) as Observable<Task[]>;

  inProgress = getObservable(this.store.collection("inProgress")) as Observable<
    Task[]
  >;
  done = getObservable(this.store.collection("done")) as Observable<Task[]>;

  constructor(private dialog: MatDialog, private store: AngularFirestore) {}

  newTask(): void {
    const dialogRef = this.dialog.open(TaskDialogComponent, {
      width: AppComponent.DIALOG_SIZE,
      data: {
        task: {},
        enableDelete: false,
      },
    });
    dialogRef.afterClosed().subscribe((result: TaskDialogResult) =>
      this.store.collection("todo").add(result.task)
    );
  }
  drop(event: CdkDragDrop<Task[] | null, any>): void {
    if (event.container === event.previousContainer) return;

    const item = event.previousContainer.data[event.previousIndex];
    this.store.firestore.runTransaction(() => {
      return Promise.all([
        this.store.collection(event.previousContainer.id).doc(item.id).delete(),
        this.store.collection(event.container.id).add(item),
      ]);
    });
    transferArrayItem(
      event.previousContainer.data,
      event.container.data as Task[],
      event.previousIndex,
      event.currentIndex,
    );
  }
  editTask(list: "done" | "inProgress" | "todo", task: Task) {
    const dialogRef = this.dialog.open(TaskDialogComponent, {
      width: AppComponent.DIALOG_SIZE,
      data: {
        task,
        enableDelete: true,
      },
    });

    dialogRef.afterClosed().subscribe((result: TaskDialogResult) => {
      if (result.delete) {
        this.store.collection(list).doc(task.id).delete();
      } else {
        this.store.collection(list).doc(task.id).update(task);
      }
    });
  }
}
