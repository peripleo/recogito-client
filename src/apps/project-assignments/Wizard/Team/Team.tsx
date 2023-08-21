import { useEffect, useState } from 'react';
import { 
  CaretDown, 
  CaretUp, 
  CaretUpDown, 
  Check, 
  CheckSquare, 
  Square, 
  Warning
} from '@phosphor-icons/react';
import * as Checkbox from '@radix-ui/react-checkbox';
import { TimeAgo } from '@components/TimeAgo';
import type { ExtendedProjectData, ProjectGroup, Translations, UserProfile } from 'src/Types';
import type { AssignmentSpec } from '../AssignmentSpec';
import { useSelectableRows } from '../useSelectableRows';

import './Team.css';

interface TeamProps {

  i18n: Translations;

  assignment: AssignmentSpec;

  project: ExtendedProjectData;

  onChange(members: UserProfile[]): void;

  onCancel(): void;

  onBack(): void;

  onNext(): void;

}

interface Member {

  id: string;

  name: string;

  user: UserProfile;

  since: string;

}

type Field = 'name' | 'since';

interface Sorting {

  field: Field;

  ascending: boolean;

}

// Flattens list of groups to the list of members, sorted by 'since'
const getMembers = (groups: ProjectGroup[], sorting?: Sorting): Member[] => groups
  .reduce((members, group) => ([
    ...members, 
    ...group.members.map(({ user, since }) => 
      ({ 
        id: user.id, 
        name: user.nickname!,  // TODO just a hack for now
        user, 
        since 
      }))
  ]), [] as Member[])
  .sort((a, b) => {
    if (sorting) {
      const { field } = sorting;
      const order = sorting.ascending ? -1 : 1;
      return (a[field] < b[field]) ? -order : (a[field] > b[field]) ? order : 0;
    } else {
      return 0;
    }
  });

export const Team = (props: TeamProps) => {

  const { t } = props.i18n;

  const [sorting, setSorting] = useState<Sorting | undefined>({ field: 'name', ascending: false });

  const members = getMembers(props.project.groups, sorting);

  const { 
    selected, 
    toggleSelected, 
    toggleAll, 
    isAllSelected 
  } = useSelectableRows(members, props.assignment.team.map(u => u.id));

  useEffect(() => {
    const members = props.project.groups.reduce((members, group) => (
      [...members, ...group.members.map(m => m.user).filter(u => selected.includes(u.id))]
    ), [] as UserProfile[]);

    props.onChange(members);
  }, [selected, props.project.groups, props.onChange]);

  const sortBy = (field: Field) => () => setSorting(sorting => { 
    if (sorting?.field === field) {
      return { field, ascending: !sorting.ascending };
    } else {
      return { field, ascending: true };
    }
  });

  // Returns the proper sort icon for the given field and
  // current sorting
  const sortIcon = (field: string) => (
    sorting?.field === field ? ( 
      sorting.ascending ? (
        <CaretDown size={12} weight="bold" />
      ) : (
        <CaretUp size={12} weight="bold" />
      )
    ) : (
      <CaretUpDown size={12} />
    )
  );

  return (
    <>
      <div className="row tab-team">
        <section className="column">
          <h1>{t['Step']}  2</h1>
          <p>
            {t['Add people to the assignment.']}
          </p>
        </section>

        <section className="column">
          <table>
           <thead>
              <tr>
                <th>
                  <Checkbox.Root 
                    className="checkbox-root"
                    checked={isAllSelected}
                    onCheckedChange={toggleAll}>
                    
                    <Checkbox.Indicator>
                      <CheckSquare size={20} weight="fill" /> 
                    </Checkbox.Indicator>

                    {!isAllSelected && (
                      <span><Square size={20} /></span>
                    )}
                  </Checkbox.Root>
                </th>

                <th>
                  <button onClick={sortBy('name')}>
                    {t['Name']} {sortIcon('name')}
                  </button>
                </th>

                <th>
                  <button onClick={sortBy('since')}>
                    {t['Member since']}  {sortIcon('since')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => (
                <tr key={member.user.id}>
                  <td>
                    <Checkbox.Root 
                      className="checkbox-root"
                      checked={selected.includes(member.id)}
                      onCheckedChange={checked => toggleSelected(member, checked)}>

                      <Checkbox.Indicator>
                        <CheckSquare size={20} weight="fill" />  
                      </Checkbox.Indicator>

                      {!selected.includes(member.id) && (
                        <span><Square size={20} /></span>
                      )}
                    </Checkbox.Root>
                  </td>

                  <td>
                    {member.user.nickname}
                  </td>

                  <td>
                    <TimeAgo datetime={member.since} locale={props.i18n.lang} />
                  </td>
                </tr>                
              ))}
            </tbody>
          </table>

          {selected.length === 0 ? (
            <p className="hint warn">
              <Warning size={16} /> {t['Select at least 1 team member']}
            </p>
          ) : selected.length === 1 ? (
            <p className="hint ok">
              <Check size={16} /> {t['Selected 1 team member']}
            </p>
          ) : (
            <p className="hint ok">
              <Check size={16} /> {t['Selected ${n} team members'].replace('${n}', selected.length.toString())}
            </p>
          )}
        </section>
      </div>

      <section className="wizard-nav">
        <button
          onClick={props.onCancel}>{t['Cancel']}</button>

        <button
          onClick={props.onBack}>{t['Back']}</button>

        <button 
          className="primary"
          onClick={props.onNext}>{t['Next']}</button>
      </section>
    </>
  )

}