import { useState } from "react";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@ui-sdk/react/alert-dialog";

export function Example() {
  const [deleted, setDeleted] = useState(false);
  return (
    <div data-slot="card" className="project-settings">
      <div>
        <span>Workspace</span>
        <h3>{deleted ? "Projects" : "Atelier"}</h3>
      </div>
      {deleted ? (
        <>
          <p role="status">Atelier was deleted.</p>
          <button type="button" autoFocus onClick={() => setDeleted(false)}>
            Restore example
          </button>
        </>
      ) : (
        <>
          <dl>
            <div>
              <dt>Visibility</dt>
              <dd>Private</dd>
            </div>
            <div>
              <dt>Environment</dt>
              <dd>Preview</dd>
            </div>
          </dl>
          <AlertDialog>
            <AlertDialogTrigger>Delete Project</AlertDialogTrigger>
            <AlertDialogBackdrop />
            <AlertDialogContent>
              <div data-slot="stack">
                <AlertDialogTitle>Delete Atelier?</AlertDialogTitle>
                <AlertDialogDescription>
                  This deletes the project, its files and its deployment history
                  for everyone on your team.
                </AlertDialogDescription>
              </div>
              <div data-slot="row">
                <AlertDialogClose>Cancel</AlertDialogClose>
                <AlertDialogClose
                  value="confirm"
                  onClick={() => setDeleted(true)}
                >
                  Delete
                </AlertDialogClose>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
