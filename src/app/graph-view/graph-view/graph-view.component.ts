import {Component, Input, OnChanges, OnInit, ViewChild} from '@angular/core';
import {D3, D3Service} from 'd3-ng2-service';
import {ForceLink, Simulation} from 'd3-force';
import {GraphNode} from './graph-data-model/graph-node';
import {Edge} from './graph-data-model/edge';
import {ZoomTransform} from 'd3-zoom';
import {GraphInteractionMode} from './graph-data-model/graph-interaction-mode.enum';
import {GraphViewService} from './graph-view.service';

@Component({
  selector: 'dnor-graph-view',
  templateUrl: './graph-view.component.html',
  styleUrls: ['./graph-view.component.css']
})
export class GraphViewComponent implements OnInit, OnChanges {
  @ViewChild('d3root') private d3Root;
  @Input('height') private height = 400;
  @Input('width') private width = 400;
  @Input('interactionMode') private interactionMode: GraphInteractionMode;

  private d3: D3;
  private nodes: GraphNode[] = [];
  private edges: Edge[] = [];
  private transform: ZoomTransform;
  private hasDragSubject = false;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private d3Sim: Simulation<GraphNode, Edge>;
  private activatedInteractionMode: GraphInteractionMode;


  constructor(private graphViewService: GraphViewService,
              private d3Service: D3Service) {
    this.d3 = d3Service.getD3();
    this.transform = this.d3.zoomIdentity;
  }

  ngOnInit() {
    // TODO: load data
    // this.SpaceService.getSpace().then((resp) => {
    //   console.log(resp);
    //   // TODO: process and push data
    // });
    this.canvas = this.d3Root.nativeElement;
    this.context = this.canvas.getContext('2d');
    this.d3Sim = this.d3.forceSimulation() as Simulation<GraphNode, Edge>;

    this.initData().then(() => {
      this.initVisualization();
      this.updateInteractionMode();
    });
  }

  ngOnChanges() {
    if (this.d3Sim) {
      this.d3Sim.force('center', this.d3.forceCenter(this.width / 2, this.height / 2));
      this.d3Sim.restart();
      this.updateInteractionMode();
    }
  }

  initVisualization() {
    const context = this.context;
    const d3Sim = this.d3Sim;

    d3Sim.force('link', this.d3.forceLink<GraphNode, Edge>().id((n, i, d) => n.id.toString()));
    d3Sim.force('charge', this.d3.forceManyBody());
    d3Sim.force('center', this.d3.forceCenter(this.width / 2, this.height / 2));

    d3Sim.force('collide', this.d3.forceCollide((node) => (node as GraphNode).radius * 1.2));
    d3Sim.nodes(this.nodes).on('tick', () => {
      context.save();
      context.clearRect(0, 0, this.width, this.height);
      context.translate(this.transform.x, this.transform.y);
      context.scale(this.transform.k, this.transform.k);
      this.edges.forEach((e: Edge) => {
        // draw edge
        e.draw(context as CanvasRenderingContext2D);
      });
      this.nodes.forEach((n) => {
        // draw node
        n.draw(context as CanvasRenderingContext2D);
      });
      context.restore();
    });
    d3Sim.force<ForceLink<GraphNode, Edge>>('link').links(this.edges)
      .distance((link, i, links) => (link as Edge).getDistance());
  }

  private updateInteractionMode() {
    if (this.activatedInteractionMode === this.interactionMode) {
      // no change
      return;
    }
    if (this.interactionMode === GraphInteractionMode.SelectAndNavigate) {
      this.setNodeSelectionBehavior((n) => this.changeSelection(n).then(() => this.initVisualization()));
    } else if (this.interactionMode === GraphInteractionMode.AddQuestion) {
      this.setNodeSelectionBehavior((n) => this.addNewChildToNode(n));
    } else if (this.interactionMode === GraphInteractionMode.EditQuestion) {
      this.setNodeSelectionBehavior((n) => this.editNode(n));
    } else if (this.interactionMode === GraphInteractionMode.AddRelation) {
      // TODO: implement and set Behavior
      this.setExploreBehavior();
    } else if (this.interactionMode === GraphInteractionMode.EditRelation) {
      this.setEdgeSelectionBehavior((e: Edge) => {
        this.edges.forEach((edge) => edge.isSelected = false);
        e.isSelected = true;
        // window.alert('Edge from [' + (e.source as GraphNode).label + '] to [' + (e.target as GraphNode).label + ']');
      });
    } else {
      this.setExploreBehavior();
    }
  }

  private  setExploreBehavior() {
    const canvas = this.canvas;
    const d3Sim = this.d3Sim;

    // drag behavior
    this.d3.select(canvas)
      .call(this.d3.drag()
        .container(canvas)
        .subject(() => {
          // console.log('subject: (' + this.d3.event.x + '/' + this.d3.event.y + ')')
          this.hasDragSubject = false;
          for (let i = this.nodes.length - 1; i >= 0; i--) {
            const n = this.nodes[i];
            const dx = this.transform.invertX(this.d3.event.x) - n.x;
            const dy = this.transform.invertY(this.d3.event.y) - n.y;
            if (Math.pow(n.radius, 2) > Math.pow(dx, 2) + Math.pow(dy, 2)) {
              n.x = this.transform.applyX(n.x);
              n.y = this.transform.applyY(n.y);
              this.hasDragSubject = true;
              return n;
            }
          }
        })
        .on('start', () => {
          if (!this.d3.event.active) {
            d3Sim.alphaTarget(0.3).restart();
          }
          this.d3.event.subject.fx = this.transform.invertX(this.d3.event.x);
          this.d3.event.subject.fy = this.transform.invertY(this.d3.event.y);
        })
        .on('drag', () => {
          // console.log(this.transform.invertX(this.d3.event.x) + '/' + this.transform.invertY(this.d3.event.y));
          this.d3.event.subject.fx = this.transform.invertX(this.d3.event.x);
          this.d3.event.subject.fy = this.transform.invertY(this.d3.event.y);
        })
        .on('end', () => {
          if (!this.d3.event.active) {
            d3Sim.alphaTarget(0);
          }
          this.d3.event.subject.fx = null;
          this.d3.event.subject.fy = null;
        })
      )
      .call(this.d3.zoom()
        .scaleExtent([1 / 4, 4])
        .filter(() => {
          // TODO: verify this is working on touch devices aswell
          if (this.d3.event.type === 'mousedown' || this.d3.event.type === 'touchstart') {
            if (this.hasDragSubject) {
              return false;
            }
          }
          return true;
        }).on('zoom', () => {
          if (!this.d3.event.active) {
            d3Sim.restart();
          }
          this.transform = this.d3.event.transform;
        }));
  }

  private setNodeSelectionBehavior(editFunction: (n: GraphNode) => void) {
    const canvas = this.canvas;
    const d3Sim = this.d3Sim;

    // drag behavior
    this.d3.select(canvas)
      .call(this.d3.drag()
        .container(canvas)
        .subject(() => {
          // console.log('subject: (' + this.d3.event.x + '/' + this.d3.event.y + ')')
          this.hasDragSubject = false;
          for (let i = this.nodes.length - 1; i >= 0; i--) {
            const n = this.nodes[i];
            const dx = this.transform.invertX(this.d3.event.x) - n.x;
            const dy = this.transform.invertY(this.d3.event.y) - n.y;
            if (Math.pow(n.radius, 2) > Math.pow(dx, 2) + Math.pow(dy, 2)) {
              n.x = this.transform.applyX(n.x);
              n.y = this.transform.applyY(n.y);
              this.hasDragSubject = true;
              return n;
            }
          }
        })
        .on('start', () => false)
        .on('drag', () => false)
        .on('end', () => {
          const n = this.d3.event.subject as GraphNode;
          const dx = this.transform.invertX(this.d3.event.x) - n.x;
          const dy = this.transform.invertY(this.d3.event.y) - n.y;
          if (Math.pow(n.radius, 2) > Math.pow(dx, 2) + Math.pow(dy, 2)) {
            editFunction(n);
            d3Sim.nodes(this.nodes);
            d3Sim.force<ForceLink<GraphNode, Edge>>('link').links(this.edges)
              .distance((link, i, links) => (link as Edge).getDistance());
            d3Sim.alpha(1).restart();
          }
        }))
      .call(this.d3.zoom().filter(() => false));
  }

  private addNewChildToNode(n: GraphNode) {
    const label = window.prompt('Ask a follow up question to: ' + n.label);
    if (label !== null) {
      const newId = this.nodes.reduce((p, c) => (p === null || c.id > p.id) ? c : p, null).id + 1;
      const newNode = new GraphNode(this.context, newId, label);
      this.nodes.push(newNode);
      this.edges.push(new Edge(n, newNode));
    }
  }

  private editNode(n: GraphNode) {
    const label = window.prompt('Edit Question:', n.label);
    if (label !== null) {
      n.setLabel(label, this.context);
    }
  }

  private changeSelection(n: GraphNode): Promise<any> {
    if (n.isSelected) {
      return new Promise((resolve, reject) => resolve());
    } else {
      n.isSelected = true;
      return this.graphViewService.getRelationsForQuestion(n.id)
        .then((relations) => {
          const promises = [];
          const newRelations = [];
          relations.forEach((r) => {
            const id = r.from === n.id ? r.to : r.from;
            if (this.nodes.findIndex((node) => node.id === id) === -1) {
              promises.push(this.graphViewService.getQuestion(id));
              newRelations.push(r);
            }
          });
          return Promise.all(promises).then((questions) => {
            questions.forEach((d) => this.nodes.push(new GraphNode(this.context, d.id, d.label)));
            newRelations.forEach(
              (e) => this.edges.push(
                new Edge(this.nodes.find((node) => node.id === e.from), this.nodes.find((node) => node.id === e.to))
              )
            );
          });
        });
    }
  }

  private setEdgeSelectionBehavior(editFunction: (e: Edge) => void) {
    const canvas = this.canvas;
    const d3Sim = this.d3Sim;

    // drag behavior
    this.d3.select(canvas)
      .call(this.d3.drag()
        .container(canvas)
        .subject(() => {
          // console.log('subject: (' + this.d3.event.x + '/' + this.d3.event.y + ')')
          this.hasDragSubject = false;
          for (let i = this.edges.length - 1; i >= 0; i--) {
            const edge = this.edges[i];
            const d_sqr = this.getPointToLineSegmentSquaredDistance(
              (edge.source as GraphNode).x, (edge.source as GraphNode).y,
              (edge.target as GraphNode).x, (edge.target as GraphNode).y,
              this.transform.invertX(this.d3.event.x), this.transform.invertY(this.d3.event.y)
            );
            if (d_sqr <= 100) {
              return edge;
            }
          }
        })
        .on('start', () => false)
        .on('drag', () => false)
        .on('end', () => {
          const edge = this.d3.event.subject as Edge;
          const d_sqr = this.getPointToLineSegmentSquaredDistance(
            (edge.source as GraphNode).x, (edge.source as GraphNode).y,
            (edge.target as GraphNode).x, (edge.target as GraphNode).y,
            this.transform.invertX(this.d3.event.x), this.transform.invertY(this.d3.event.y)
          );
          if (d_sqr <= 100) {
            editFunction(edge);
            d3Sim.nodes(this.nodes);
            d3Sim.force<ForceLink<GraphNode, Edge>>('link').links(this.edges)
              .distance((link, i, links) => (link as Edge).getDistance());
            d3Sim.alpha(1).restart();
          }
        }))
      .call(this.d3.zoom().filter(() => false));
  }

  private getPointToLineSegmentSquaredDistance(ax: number, ay: number, bx: number, by: number, px: number, py: number) {
    // calculate unit vector of AB
    const ab_len = Math.sqrt(Math.pow(bx - ax, 2) + Math.pow(by - ay, 2));
    const abx_0 = (bx - ax) / ab_len;
    const aby_0 = (by - ay) / ab_len;

    // calculate projection point C, projecting AP on AB
    const dot = abx_0 * (px - ax) + aby_0 * (py - ay);
    const cx = ax + dot * abx_0;
    const cy = ay + dot * aby_0;

    // calculate multiplier for unit vector to reach point C from point A
    const ac_mul = (cx - ax) / abx_0;

    let d_sqr;
    if (ac_mul < 0) {
      // not above the line segment, closer to A
      d_sqr = Math.pow(ax - px, 2) + Math.pow(ay - py, 2);
    } else if (ac_mul > ab_len) {
      // not above the line segment, closer to B
      d_sqr = Math.pow(bx - px, 2) + Math.pow(by - py, 2);
    } else {
      // above the line segment, distance to C === distance to AB
      d_sqr = Math.pow(cx - px, 2) + Math.pow(cy - py, 2);
    }
    return d_sqr;
  }

  private initData() {
    const context = this.d3Root.nativeElement.getContext('2d');
    return Promise.all<any, any[]>([this.graphViewService.getQuestion(1), this.graphViewService.getRelationsForQuestion(1)])
      .then((values) => {
        const initialQuestion = values[0];
        const initialQuestions = [];
        const initialQuestionRelations = values[1];

        return Promise.all(initialQuestionRelations.map((r) => {
          if (r.from === initialQuestion.id) {
            return this.graphViewService.getQuestion(r.to);
          } else {
            return this.graphViewService.getQuestion(r.from);
          }
        })).then((questions) => {
          questions.forEach((q) => initialQuestions.push(q));
          // generate nodes
          this.nodes.push(new GraphNode(context, initialQuestion.id, initialQuestion.label, true));
          initialQuestions.forEach((d) => this.nodes.push(new GraphNode(context, d.id, d.label)));
          // create an array with edges
          initialQuestionRelations.forEach(
            (e) => this.edges.push(
              new Edge(this.nodes.find((n) => n.id === e.from), this.nodes.find((n) => n.id === e.to))
            )
          );
        });
      });


  }

}
